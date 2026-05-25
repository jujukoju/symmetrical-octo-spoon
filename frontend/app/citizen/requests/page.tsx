"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, XCircle, Shield, Building2,
  ChevronDown, ChevronUp, AlertTriangle, FileCheck,
} from "lucide-react";
import { verificationRequests } from "@/lib/mockData";
import { VerificationRequest } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const statusConfig = {
  pending:  { color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", icon: Clock,        label: "Pending" },
  approved: { color: "text-green",     bg: "bg-green/5",   border: "border-green/20",  icon: CheckCircle2, label: "Approved" },
  denied:   { color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",   icon: XCircle,      label: "Denied" },
  expired:  { color: "text-ink-muted", bg: "bg-surface-soft", border: "border-surface-border", icon: Clock, label: "Expired" },
};

const riskConfig = {
  low:      "text-green bg-green/10",
  medium:   "text-amber-700 bg-amber-50",
  high:     "text-red-700 bg-red-50",
  critical: "text-red-900 bg-red-100",
};

function RequestCard({ req }: { req: VerificationRequest }) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(req.status);
  const cfg = statusConfig[localStatus] || statusConfig.pending;
  const Icon = cfg.icon;

  const approve = () => setLocalStatus("approved");
  const deny    = () => setLocalStatus("denied");

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} shadow-card overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-surface-border text-lg shrink-0">
              {req.institution.logo}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-ink text-sm truncate">{req.institution.name}</p>
              <p className="text-xs text-ink-muted truncate mt-0.5">{req.purpose}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${cfg.color} bg-white border ${cfg.border}`}>
              <Icon className="h-3 w-3" /> {cfg.label}
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3">
          <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${riskConfig[req.riskLevel]}`}>
            {req.riskLevel} risk
          </div>
          <span className="text-[10px] text-ink-muted">Level {req.requestedLevel} access</span>
          <span className="text-[10px] text-ink-muted ml-auto">{timeAgo(req.requestedAt)}</span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-white/60 pt-4 space-y-4">

              {/* Data requested */}
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Data Fields Requested</p>
                <div className="flex flex-wrap gap-1.5">
                  {req.requestedScope.map((field) => (
                    <span key={field} className="rounded-full border border-surface-border bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink capitalize">
                      {field.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Institution details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-surface-border p-3">
                  <p className="text-ink-muted mb-0.5">Trust Score</p>
                  <p className="font-bold text-ink">{req.institution.trustScore}%</p>
                </div>
                <div className="rounded-lg bg-white border border-surface-border p-3">
                  <p className="text-ink-muted mb-0.5">Expires</p>
                  <p className="font-bold text-ink">{new Date(req.expiresAt).toLocaleDateString("en-NG")}</p>
                </div>
              </div>

              {req.blockchainTxHash && (
                <div className="rounded-lg bg-white border border-surface-border p-3">
                  <p className="text-[10px] text-ink-muted uppercase tracking-wider mb-1">Blockchain Reference</p>
                  <p className="text-xs font-mono text-ink truncate">{req.blockchainTxHash}</p>
                </div>
              )}

              {/* Actions */}
              {localStatus === "pending" && (
                <div className="flex gap-3 pt-1">
                  <button onClick={approve}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green py-2.5 text-sm font-bold text-white hover:bg-green-dark transition-all">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={deny}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 transition-all">
                    <XCircle className="h-4 w-4" /> Deny
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CitizenRequestsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const filtered = verificationRequests.filter(
    (r) => filter === "all" || r.status === filter
  );

  const counts = {
    all: verificationRequests.length,
    pending: verificationRequests.filter((r) => r.status === "pending").length,
    approved: verificationRequests.filter((r) => r.status === "approved").length,
    denied: verificationRequests.filter((r) => r.status === "denied").length,
  };

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Citizen Account</p>
          <h1 className="text-3xl font-bold text-ink">Access Requests</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Institutions requesting access to your identity data. You control who sees what.
          </p>
        </motion.div>

        {/* Summary Banner */}
        {counts.pending > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              <strong>{counts.pending} pending request{counts.pending > 1 ? "s" : ""}</strong> — review and respond to keep your data protected.
            </p>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved", "denied"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all capitalize ${
                filter === tab
                  ? "bg-green text-white shadow-green-sm"
                  : "bg-white border border-surface-border text-ink-secondary hover:border-green/40 hover:text-green"
              }`}>
              {tab} {counts[tab] > 0 && <span className="ml-1 text-[10px] font-bold opacity-70">({counts[tab]})</span>}
            </button>
          ))}
        </motion.div>

        {/* Request Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-white p-12 text-center">
              <FileCheck className="h-10 w-10 text-ink-muted mx-auto mb-3" />
              <p className="text-ink-secondary text-sm">No {filter === "all" ? "" : filter} requests found.</p>
            </div>
          ) : (
            filtered.map((req) => <RequestCard key={req.id} req={req} />)
          )}
        </div>

      </div>
    </div>
  );
}