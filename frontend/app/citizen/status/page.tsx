"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Shield, CheckCircle2, XCircle, Loader2, Calendar,
  Globe, Database, ArrowRight, HelpCircle, FileText
} from "lucide-react";
import { api } from "@/lib/api";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { cn } from "@/lib/utils";

export default function CheckStatusPage() {
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobData, setJobData] = useState<{
    job_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    step: string;
    tx_hash?: string;
    error?: string;
    timestamp?: string;
  } | null>(null);

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId.trim()) {
      setError("Please enter a valid Tracking ID.");
      return;
    }
    setError("");
    setLoading(true);
    setJobData(null);

    try {
      const res = await api.checkEnrollStatus(jobId.trim());
      if (res.success && res.data) {
        setJobData(res.data);
      } else {
        setError(res.error || "Tracking ID not found. Ensure it is correct.");
      }
    } catch {
      setError("Failed to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["citizen"]}>
      <div className="min-h-screen bg-surface-soft py-12">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">Tracking System</p>
            <h1 className="text-2xl font-bold text-ink">Check Registration Status</h1>
            <p className="text-ink-secondary text-xs mt-2">
              Trace your asynchronous identity enrollment status from processing to Sepolia block confirmation.
            </p>
          </motion.div>

          {/* Search Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-surface-border bg-white p-6 shadow-card mb-6">
            <form onSubmit={handleCheckStatus} className="space-y-4">
              <div>
                <label htmlFor="tracking-id" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
                  Enter Enrollment Job ID / Tracking ID
                </label>
                <div className="relative">
                  <input
                    id="tracking-id"
                    type="text"
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    className="w-full rounded-xl border border-surface-border bg-white pl-4 pr-12 py-3.5 text-sm font-mono text-ink placeholder-ink-light focus:border-green focus:ring-1 focus:ring-green transition-all"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-green text-white hover:bg-green-light transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </motion.div>

          {/* Status Display Area */}
          <AnimatePresence mode="wait">
            {jobData && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="rounded-2xl border border-surface-border bg-white p-6 sm:p-8 shadow-card"
              >
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-border">
                  <div>
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest leading-none mb-1.5">Job UUID</p>
                    <p className="font-mono text-xs text-ink-secondary truncate max-w-[200px] sm:max-w-md">{jobData.job_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest leading-none mb-1.5">Status</p>
                    <span className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                      jobData.status === "completed" ? "bg-green/10 text-green border border-green/20" :
                      jobData.status === "failed" ? "bg-red-100 text-red-700 border border-red-200" :
                      "bg-amber-100 text-amber-700 border border-amber-200 animate-pulse"
                    )}>
                      {jobData.status}
                    </span>
                  </div>
                </div>

                {jobData.status === "completed" && (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 bg-green/5 border border-green/15 rounded-2xl p-5">
                      <CheckCircle2 className="h-6 w-6 text-green shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-green-dark mb-1">Identity Enrollment Completed</h4>
                        <p className="text-xs text-ink-secondary leading-relaxed">
                          Your biometrics have been verified, encrypted, stored, and your decentralized identity has been successfully registered on the Ethereum blockchain.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center border-b border-surface-border pb-3">
                        <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-green" /> Storage Reference
                        </span>
                        <span className="text-xs font-mono font-bold text-ink">
                          local-db:enrollment-{jobData.job_id.slice(0, 8)}
                        </span>
                      </div>

                      {jobData.timestamp && (
                        <div className="flex justify-between items-center border-b border-surface-border pb-3">
                          <span className="text-[10px] font-bold text-ink-muted uppercase flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-green" /> Timestamp
                          </span>
                          <span className="text-xs font-bold text-ink">
                            {new Date(jobData.timestamp).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {jobData.tx_hash && (
                        <div className="bg-surface-soft border border-surface-border rounded-xl p-4 text-left">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-ink-muted uppercase flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 text-green animate-pulse" /> Sepolia Transaction Hash
                            </span>
                          </div>
                          <p className="text-xs font-mono font-bold text-green truncate mb-2">{jobData.tx_hash}</p>
                          {jobData.tx_hash !== "Mocked transaction recorded" ? (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${jobData.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-green hover:underline"
                            >
                              View on Etherscan <ArrowRight className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[9px] font-bold text-ink-muted uppercase">On-Chain Registry Sandbox Link</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {jobData.status === "failed" && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-5">
                      <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-900 mb-1">Workflow Aborted</h4>
                        <p className="text-xs text-red-700 leading-relaxed">
                          The identity registration was halted due to a processing error.
                        </p>
                      </div>
                    </div>
                    {jobData.error && (
                      <div className="p-4 bg-surface-soft border border-surface-border rounded-xl">
                        <p className="text-[10px] font-bold text-ink-muted uppercase mb-1">Error Details</p>
                        <p className="text-xs font-mono text-ink-secondary">{jobData.error}</p>
                      </div>
                    )}
                  </div>
                )}

                {(jobData.status === "pending" || jobData.status === "processing") && (
                  <div className="text-center py-6 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-green mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-ink">Job Status: {jobData.step}</h4>
                    <p className="text-xs text-ink-secondary max-w-sm mx-auto">
                      The NIMC Oracle is executing the cryptographic proof flow. Please refresh in a moment.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 text-center bg-green/5 border border-green/10 rounded-xl p-4 flex gap-3 max-w-md mx-auto items-start">
            <HelpCircle className="h-5 w-5 text-green shrink-0 mt-0.5" />
            <div className="text-left">
              <h5 className="text-[11px] font-bold text-green-dark uppercase">How status tracking works</h5>
              <p className="text-[10px] text-ink-secondary mt-1 leading-normal">
                When you register, you receive a temporary tracking ID. Our decentralized backend processes your biometrics using neural embeddings before broadcasting them securely to the Sepolia ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
