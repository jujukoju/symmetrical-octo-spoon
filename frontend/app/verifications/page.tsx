"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, SlidersHorizontal, ChevronDown, Fingerprint, Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verificationRequests } from "@/lib/mockData";
import { AccessRequestCard } from "@/components/shared/AccessRequestCard";
import type { RequestStatus } from "@/lib/types";
import { api } from "@/lib/api";
import type { VerifyResponse } from "@/lib/api";

const statusFilters: { label: string; value: RequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Denied", value: "denied" },
  { label: "Expired", value: "expired" },
];

const riskFilters = ["all", "low", "medium", "high"];

const statusCount = (s: RequestStatus | "all") =>
  s === "all" ? verificationRequests.length : verificationRequests.filter((r) => r.status === s).length;

export default function VerificationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [risk, setRisk] = useState("all");
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [denied, setDenied] = useState<Set<string>>(new Set());

  // Live Verification State
  const [liveNIN, setLiveNIN] = useState("");
  const [liveFile, setLiveFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleLiveVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveFile || liveNIN.length !== 11) return;

    setIsVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);

    const res = await api.verify(liveNIN, liveFile);
    if (res.success && res.data) {
      setVerifyResult(res.data);
    } else {
      setVerifyError(res.error || "Verification failed");
    }
    setIsVerifying(false);
  };

  const filtered = useMemo(() => {
    return verificationRequests.filter((r) => {
      const matchSearch = r.institution.name.toLowerCase().includes(search.toLowerCase()) ||
        r.purpose.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || r.status === status;
      const matchRisk = risk === "all" || r.riskLevel === risk;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [search, status, risk]);

  const handleApprove = (id: string) => setApproved((prev) => new Set([...prev, id]));
  const handleDeny = (id: string) => setDenied((prev) => new Set([...prev, id]));

  return (
    <div className="min-h-screen bg-charcoal py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold/80 mb-1">Identity Management</p>
          <h1 className="text-3xl font-bold text-white mb-2">Verification Hub</h1>
          <p className="text-slate-400 text-sm">Manage all institution requests or perform a live biometric check.</p>
        </motion.div>

        {/* ── Live Verification Panel ────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8 rounded-2xl border border-gold/20 bg-gold/5 p-6 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Fingerprint className="h-24 w-24 text-gold" />
          </div>

          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" /> Instant Biometric Check
          </h2>

          <form onSubmit={handleLiveVerify} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Subject NIN</label>
              <input
                type="text" maxLength={11} placeholder="11-digit NIN" value={liveNIN}
                onChange={(e) => setLiveNIN(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-charcoal-border bg-charcoal px-4 py-2.5 text-sm text-white focus:border-gold/50 focus:outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Fingerprint Image</label>
              <div className="relative">
                <input
                  type="file" accept="image/*"
                  onChange={(e) => setLiveFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-charcoal-border bg-charcoal px-4 py-2 text-xs text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold/10 file:text-gold hover:file:bg-gold/20 cursor-pointer"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isVerifying || !liveFile || liveNIN.length !== 11}
              className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold px-8 py-3 text-sm font-bold text-charcoal hover:bg-gold-light transition-all disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Identity"}
            </button>
          </form>

          {/* Results Overlay */}
          <AnimatePresence>
            {(verifyResult || verifyError) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={`mt-6 rounded-xl border p-4 ${
                  verifyResult?.decision === "MATCH"
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : "border-red-400/30 bg-red-400/10"
                }`}>
                <div className="flex items-start gap-3">
                  {verifyResult?.decision === "MATCH" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${
                      verifyResult?.decision === "MATCH" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {verifyResult
                        ? verifyResult.decision === "MATCH"
                          ? "Identity MATCH Verified"
                          : "Identity MISMATCH Detected"
                        : "Verification Error"}
                    </p>
                    {verifyResult ? (
                      <div className="text-xs text-slate-300 mt-1 space-y-0.5">
                        <p>NIN: {verifyResult.nin}</p>
                        <p>
                          Similarity: {(verifyResult.similarity * 100).toFixed(1)}% &nbsp;|&nbsp;
                          Distance: {verifyResult.distance.toFixed(4)} &nbsp;|&nbsp;
                          Threshold: {verifyResult.threshold}
                        </p>
                        <p className="text-slate-500 font-mono text-[10px]">Ref: {verifyResult.request_id}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-red-300 mt-1">{verifyError}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statusFilters.map(({ label, value }) => (
            <motion.button key={value} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setStatus(value)}
              className={`rounded-xl border p-4 text-left transition-all ${status === value
                ? "border-gold/40 bg-gold/8"
                : "border-charcoal-border bg-charcoal-light hover:border-gold/20"}`}>
              <p className={`text-2xl font-bold mb-1 ${status === value ? "text-gold" : "text-white"}`}>
                {statusCount(value)}
              </p>
              <p className="text-xs text-slate-400">{label}</p>
            </motion.button>
          ))}
        </div>

        {/* Filters bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mb-6 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text" placeholder="Search institution or purpose…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-charcoal-border bg-charcoal-light pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-gold/40 focus:outline-none transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select value={status} onChange={(e) => setStatus(e.target.value as RequestStatus | "all")}
              className="appearance-none rounded-xl border border-charcoal-border bg-charcoal-light px-4 py-2.5 pr-8 text-sm text-white focus:border-gold/40 focus:outline-none transition-colors cursor-pointer">
              {statusFilters.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          </div>

          {/* Risk filter */}
          <div className="relative">
            <select value={risk} onChange={(e) => setRisk(e.target.value)}
              className="appearance-none rounded-xl border border-charcoal-border bg-charcoal-light px-4 py-2.5 pr-8 text-sm text-white focus:border-gold/40 focus:outline-none transition-colors cursor-pointer">
              {riskFilters.map((r) => (
                <option key={r} value={r}>{r === "all" ? "All Risk Levels" : `${r.charAt(0).toUpperCase() + r.slice(1)} Risk`}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          </div>
        </motion.div>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-400">{filtered.length} request{filtered.length !== 1 ? "s" : ""} found</p>
          {(search || status !== "all" || risk !== "all") && (
            <button onClick={() => { setSearch(""); setStatus("all"); setRisk("all"); }}
              className="text-xs text-gold hover:text-gold-light transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((req, i) => {
              const effective = { ...req, status: approved.has(req.id) ? "approved" as const : denied.has(req.id) ? "denied" as const : req.status };
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}>
                  <AccessRequestCard request={effective}
                    showActions={!approved.has(req.id) && !denied.has(req.id)}
                    onApprove={() => handleApprove(req.id)}
                    onDeny={() => handleDeny(req.id)} />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-charcoal-border bg-charcoal-light p-16 text-center">
            <Filter className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No matching requests</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
