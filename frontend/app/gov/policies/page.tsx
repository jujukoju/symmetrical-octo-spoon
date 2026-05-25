"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote, Shield, CheckCircle2, XCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Users, Lock, Unlock, Settings,
} from "lucide-react";
import { governanceActions } from "@/lib/mockData";
import { GovernanceAction } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const statusConfig = {
  pending:  { color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", icon: Clock },
  approved: { color: "text-green",     bg: "bg-green/5",   border: "border-green/20",  icon: CheckCircle2 },
  denied:   { color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",   icon: XCircle },
  expired:  { color: "text-ink-muted", bg: "bg-surface-soft", border: "border-surface-border", icon: Clock },
};

const riskColors = {
  low:      "text-green bg-green/10",
  medium:   "text-amber-700 bg-amber-50",
  high:     "text-red-700 bg-red-50",
  critical: "text-red-900 bg-red-100",
};

function GovernanceCard({ action }: { action: GovernanceAction }) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(action.status);
  const cfg = statusConfig[localStatus] || statusConfig.pending;
  const Icon = cfg.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} shadow-card overflow-hidden`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-surface-border text-xl shrink-0">
              {action.institution.logo}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-ink text-sm truncate">{action.title}</p>
              <p className="text-xs text-ink-muted truncate mt-0.5">{action.institution.name} · {action.requestedBy}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${cfg.color} bg-white border ${cfg.border}`}>
              <Icon className="h-3 w-3" /> {localStatus}
            </div>
            {expanded ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${riskColors[action.riskLevel]}`}>
            {action.riskLevel} risk
          </span>
          <span className="text-[10px] text-ink-muted capitalize">{action.type.replace("_", " ")}</span>
          <span className="text-[10px] text-ink-muted ml-auto">{timeAgo(action.createdAt)}</span>
        </div>

        {/* Approval Progress Bar */}
        {localStatus === "pending" && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-ink-muted mb-1">
              <span>Approval Progress</span>
              <span>{action.currentApprovals}/{action.requiredApprovals} approvals</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${action.approvalProgress}%` }} />
            </div>
          </div>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 border-t border-white/50 pt-4 space-y-4">
              <p className="text-xs text-ink-secondary">{action.description}</p>

              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Data Scope</p>
                <div className="flex flex-wrap gap-1.5">
                  {action.dataScope.map((field) => (
                    <span key={field} className="rounded-full border border-surface-border bg-white px-2.5 py-0.5 text-[11px] font-medium text-ink capitalize">
                      {field.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white border border-surface-border p-3">
                  <p className="text-ink-muted mb-0.5">Trust Score</p>
                  <p className="font-bold text-ink">{action.institution.trustScore}%</p>
                </div>
                <div className="rounded-lg bg-white border border-surface-border p-3">
                  <p className="text-ink-muted mb-0.5">Expires</p>
                  <p className="font-bold text-ink">{new Date(action.expiryDate).toLocaleDateString("en-NG")}</p>
                </div>
              </div>

              {localStatus === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => setLocalStatus("approved")}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green py-2.5 text-sm font-bold text-white hover:bg-green-dark transition-all shadow-green-sm">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => setLocalStatus("denied")}
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

const systemPolicies = [
  { id: "p1", label: "Maximum Access Level for Banks",       value: "Level 3",  icon: Lock,   editable: false },
  { id: "p2", label: "WebAuthn Timeout (seconds)",           value: "60s",      icon: Settings,editable: true },
  { id: "p3", label: "Biometric Score Threshold",            value: "70%",      icon: Shield, editable: true },
  { id: "p4", label: "Multi-Approval Required Above",        value: "Level 4",  icon: Users,  editable: false },
  { id: "p5", label: "IPFS Pinning Enabled",                 value: "Yes",      icon: Unlock, editable: false },
  { id: "p6", label: "Audit Retention (years)",              value: "7 years",  icon: Vote,   editable: false },
];

export default function GovPoliciesPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const filtered = governanceActions.filter(
    (a) => filter === "all" || a.status === filter
  );

  const counts = {
    all: governanceActions.length,
    pending: governanceActions.filter((a) => a.status === "pending").length,
    approved: governanceActions.filter((a) => a.status === "approved").length,
    denied: governanceActions.filter((a) => a.status === "denied").length,
  };

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Government Portal</p>
          <h1 className="text-3xl font-bold text-ink">Governance</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Review and action institution access requests. Manage platform-wide identity policies.
          </p>
        </motion.div>

        {/* Pending Banner */}
        {counts.pending > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              <strong>{counts.pending} governance request{counts.pending > 1 ? "s" : ""}</strong> pending your approval.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left: Governance Actions */}
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-ink">Pending Actions</h2>
              <div className="flex gap-2">
                {(["all", "pending", "approved", "denied"] as const).map((tab) => (
                  <button key={tab} onClick={() => setFilter(tab)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all capitalize ${
                      filter === tab ? "bg-green text-white" : "bg-white border border-surface-border text-ink-secondary hover:border-green/40"
                    }`}>
                    {tab} {counts[tab] > 0 && `(${counts[tab]})`}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {filtered.map((action) => <GovernanceCard key={action.id} action={action} />)}
            </div>
          </div>

          {/* Right: Platform Policies */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <h2 className="font-bold text-ink mb-5 flex items-center gap-2">
                <Settings className="h-4 w-4 text-green" /> Platform Policies
              </h2>
              <div className="space-y-3">
                {systemPolicies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-soft px-3 py-2.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p.icon className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                      <p className="text-xs text-ink truncate">{p.label}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs font-bold text-green">{p.value}</span>
                      {p.editable && (
                        <button className="ml-1 text-[10px] font-bold text-ink-muted hover:text-green transition-colors">Edit</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-ink-muted mt-4 text-center">
                Policy changes require multi-party government approval.
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
