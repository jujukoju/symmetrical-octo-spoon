"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Shield, CheckCircle2, XCircle, Loader2, Fingerprint,
  AlertTriangle, ChevronRight, Lock,
} from "lucide-react";
import { api, VerifyResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

type Step = "input" | "scanning" | "result";

const accessLevelLabels: Record<number, string> = {
  1: "Identity Confirmation (Boolean)",
  2: "Basic Identity (Name and Photo)",
  3: "Standard Demographics",
  4: "Full Residency Info",
  5: "Full Disclosure",
};

export default function InstitutionVerifyPage() {
  const [nin, setNin] = useState("");
  const [level, setLevel] = useState(3);
  const [step, setStep] = useState<Step>("input");
  const [decision, setDecision] = useState<"MATCH" | "NO_MATCH" | null>(null);
  const [error, setError] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [fingerprintFile, setFingerprintFile] = useState<File | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nin.length !== 11) {
      setError("NIN must be exactly 11 digits.");
      return;
    }
    if (!fingerprintFile) {
      setError("Upload a fingerprint image (BMP, PNG, or JPEG).");
      return;
    }
    setError("");
    setStep("scanning");

    const res = await api.verify(nin, fingerprintFile);
    if (res.success && res.data) {
      setVerifyResult(res.data);
      setDecision(res.data.decision);
      setStep("result");
    } else {
      setError(res.error || "Verification failed.");
      setStep("input");
    }
  };

  const reset = () => {
    setStep("input");
    setDecision(null);
    setVerifyResult(null);
    setError("");
    setNin("");
    setFingerprintFile(null);
  };

  const scorePercent =
    verifyResult != null ? Math.round(Math.max(0, verifyResult.similarity) * 100) : null;

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Institution Portal</p>
          <h1 className="text-3xl font-bold text-ink">Verify Citizen Identity</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Enter the citizen NIN and upload a fingerprint image to verify against the enrolled template.
          </p>
        </motion.div>

        {step === "input" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
            <form onSubmit={handleVerify} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">National Identity Number (NIN)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="Enter 11-digit NIN"
                  className="w-full rounded-xl border border-surface-border pl-4 pr-4 py-3 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-2">Fingerprint image</label>
                <input
                  type="file"
                  accept="image/bmp,image/png,image/jpeg"
                  onChange={(e) => setFingerprintFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                  required
                />
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>
              )}
              <button type="submit" disabled={nin.length !== 11 || !fingerprintFile}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green py-3.5 text-sm font-bold text-white disabled:opacity-40">
                <Fingerprint className="h-4 w-4" /> Verify fingerprint
              </button>
            </form>
          </motion.div>
        )}

        {step === "scanning" && (
          <motion.div className="rounded-2xl border border-surface-border bg-white p-12 text-center shadow-card">
            <Loader2 className="h-10 w-10 animate-spin text-green mx-auto mb-4" />
            <p className="text-sm text-ink-secondary">Running biometric verification for NIN {nin}…</p>
          </motion.div>
        )}

        {step === "result" && decision && verifyResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl border p-6 sm:p-8 shadow-card space-y-6 ${
              decision === "MATCH" ? "border-green/20 bg-green/5" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="text-center">
              {decision === "MATCH" ? (
                <CheckCircle2 className="h-14 w-14 text-green mx-auto mb-3" />
              ) : (
                <XCircle className="h-14 w-14 text-red-600 mx-auto mb-3" />
              )}
              <h2 className="text-2xl font-bold text-ink mb-1">
                {decision === "MATCH" ? "Identity Verified" : "Verification Failed"}
              </h2>
              <p className="text-xs text-ink-secondary">
                Biometric fingerprint comparison completed with NIN: <strong>{verifyResult.nin}</strong>
              </p>
            </div>

            {/* Metrics Breakdown */}
            <div className="bg-white border border-surface-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Biometric Match Analysis</h3>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-surface-soft p-3 rounded-lg border border-surface-border">
                  <p className="text-sm font-black text-ink">{scorePercent}%</p>
                  <p className="text-[9px] font-semibold text-ink-muted uppercase">Similarity</p>
                </div>
                <div className="bg-surface-soft p-3 rounded-lg border border-surface-border">
                  <p className="text-sm font-mono font-bold text-ink">{verifyResult.distance}</p>
                  <p className="text-[9px] font-semibold text-ink-muted uppercase">Distance</p>
                </div>
                <div className="bg-surface-soft p-3 rounded-lg border border-surface-border">
                  <p className="text-sm font-mono font-bold text-ink">{verifyResult.threshold}</p>
                  <p className="text-[9px] font-semibold text-ink-muted uppercase">Threshold</p>
                </div>
              </div>

              {/* Slider Representation */}
              <div>
                <div className="flex justify-between text-[9px] font-bold text-ink-muted uppercase mb-1">
                  <span>Match (0.0)</span>
                  <span className="text-red-500">Threshold ({verifyResult.threshold})</span>
                  <span>No Match (1.0)</span>
                </div>
                <div className="relative h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                  {/* Threshold mark */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{ left: `${verifyResult.threshold * 100}%` }}
                  />
                  {/* Current distance marker */}
                  <div
                    className={cn(
                      "absolute top-0 bottom-0 rounded-full",
                      decision === "MATCH" ? "bg-green" : "bg-red-500"
                    )}
                    style={{ width: `${verifyResult.distance * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Transaction / Audit Trail details */}
            <div className="bg-white border border-surface-border rounded-xl p-5 text-left space-y-2.5 shadow-sm text-xs">
              <h3 className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">Transaction Audit Details</h3>
              <div className="flex justify-between items-center border-b border-surface-border/50 pb-2">
                <span className="text-ink-muted">Request ID</span>
                <span className="font-mono font-bold text-ink">{verifyResult.request_id}</span>
              </div>
              <div className="flex justify-between items-center border-b border-surface-border/50 pb-2">
                <span className="text-ink-muted">Query Timestamp</span>
                <span className="font-semibold text-ink">{new Date(verifyResult.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-start pt-1 gap-3">
                <Shield className="h-4 w-4 text-green shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-green block">On-Chain Audit Registered</span>
                  <span className="text-[10px] text-ink-secondary">
                    Verification query recorded to the smart contract ledger. Event <code>AccessLogged</code> emitted successfully.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={reset}
                className="w-full sm:w-auto rounded-xl bg-ink hover:bg-ink-light px-8 py-3.5 text-sm font-bold text-white transition-all shadow-sm"
              >
                Conduct New Verification
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
