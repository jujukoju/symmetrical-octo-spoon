"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote, CheckCircle2, XCircle, Clock, AlertTriangle,
  Shield, ChevronDown, ChevronUp, Filter, Search,
} from "lucide-react";
import { governanceActions } from "@/lib/mockData";
import type { GovernanceAction } from "@/lib/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { cn } from "@/lib/utils";

const riskColors: Record<string, string> = {
  low:      "text-green bg-green/5 border-green/20",
  medium:   "text-amber-700 bg-amber-50 border-amber-200",
  high:     "text-orange-700 bg-orange-50 border-orange-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

function GovernanceCard({
  action, onApprove, onDeny,
}: { action: GovernanceAction; onApprove: () => void; onDeny: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = action.status === "pending";

  return (
    <motion.div layout
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden shadow-card",
        isPending ? "border-green/25 bg-white" : "border-surface-border bg-surface-soft/60"
      )}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-surface-border text-2xl shrink-0 shadow-sm">
            {action.institution.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-bold text-ink text-sm">{action.title}</h3>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", riskColors[action.riskLevel])}>
                {action.riskLevel} risk
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3">{action.description}</p>

            {/* Requested scope chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {action.dataScope.map((scope) => (
                <span key={scope} className="rounded-md bg-surface-muted border border-surface-border px-2 py-0.5 text-[10px] text-ink-secondary font-mono">
                  {scope.replace(/_/g, " ")}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[10px] text-ink-light font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo(action.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                Expires {formatDate(action.expiryDate)}
              </span>
            </div>
          </div>

          {/* Status indicator */}
          <div className="shrink-0">
            {action.status === "approved" && <CheckCircle2 className="h-5 w-5 text-green" />}
            {action.status === "denied"   && <XCircle      className="h-5 w-5 text-red-600" />}
            {action.status === "pending"  && <Clock        className="h-5 w-5 text-amber-500 animate-pulse" />}
          </div>
        </div>

        {/* Approval progress */}
        {isPending && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted mb-1.5 uppercase">
              <span>Approval Progress</span>
              <span>{action.currentApprovals}/{action.requiredApprovals} Signed</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full rounded-full bg-green transition-all"
                style={{ width: `${action.approvalProgress}%` }} />
            </div>
          </div>
        )}

        {/* Actions */}
        {isPending && (
          <div className="mt-4 flex gap-3">
            <button onClick={onApprove}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green px-4 py-2.5 text-sm font-bold text-white hover:bg-green-light transition-all shadow-green-sm">
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button onClick={onDeny}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all">
              <XCircle className="h-4 w-4" /> Deny
            </button>
          </div>
        )}

        {/* Expand toggle */}
        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase text-ink-muted hover:text-green transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "Less details" : "More details"}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-surface-border bg-surface-soft/50">
            <div className="p-5 grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-ink-muted mb-1 font-semibold uppercase tracking-wider text-[9px]">Requested by</p>
                <p className="text-ink font-medium">{action.requestedBy}</p>
              </div>
              <div>
                <p className="text-ink-muted mb-1 font-semibold uppercase tracking-wider text-[9px]">Action type</p>
                <p className="text-ink font-medium capitalize">{action.type.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-ink-muted mb-1 font-semibold uppercase tracking-wider text-[9px]">Institution</p>
                <p className="text-ink font-medium">{action.institution.name}</p>
              </div>
              {action.resolvedAt && (
                <div>
                  <p className="text-ink-muted mb-1 font-semibold uppercase tracking-wider text-[9px]">Resolved</p>
                  <p className="text-ink font-medium">{formatDate(action.resolvedAt)}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GovernancePage() {
  const [actions, setActions] = useState(governanceActions);
  const [tab, setTab] = useState<"pending" | "resolved">("pending");

  const pending  = actions.filter((a) => a.status === "pending");
  const resolved = actions.filter((a) => a.status !== "pending");

  const approve = (id: string) =>
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" as const, approvalProgress: 100 } : a));
  const deny = (id: string) =>
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, status: "denied" as const } : a));

  const displayed = tab === "pending" ? pending : resolved;

  return (
    <RoleGuard allowedRoles={["government"]}>
      <div className="min-h-screen bg-surface-soft py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Access Governance</p>
            <h1 className="text-3xl font-bold text-ink mb-2">Governance Hub</h1>
            <p className="text-ink-secondary text-sm">
              Review, approve, or deny institution access requests. All actions are anchored on the blockchain.
            </p>
          </motion.div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Pending",  count: pending.length,  color: "text-amber-700",  bg: "bg-amber-50", border: "border-amber-200" },
              { label: "Approved", count: resolved.filter((a) => a.status === "approved").length, color: "text-green", bg: "bg-green/5", border: "border-green/20" },
              { label: "Denied",   count: resolved.filter((a) => a.status === "denied").length,   color: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} className={`rounded-2xl border ${border} ${bg} p-5 text-center shadow-card`}>
                <p className={`text-3xl font-black ${color} mb-1`}>{count}</p>
                <p className="text-xs text-ink-muted font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl border border-surface-border bg-white p-1 mb-6 w-fit shadow-sm">
            {(["pending", "resolved"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-6 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                  tab === t ? "bg-green text-white shadow-green-sm" : "text-ink-muted hover:text-green"
                )}>
                {t} {t === "pending" ? `(${pending.length})` : `(${resolved.length})`}
              </button>
            ))}
          </div>

          {/* Risk warning */}
          {tab === "pending" && pending.some((a) => a.riskLevel === "high") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <p className="text-xs text-orange-700 font-medium">
                <span className="font-bold">High-risk request detected.</span>{" "}
                Review the data scope carefully before approving. Multi-party verification required.
              </p>
            </motion.div>
          )}

          {/* Action cards */}
          <div className="space-y-4">
            {displayed.length > 0 ? displayed.map((action, i) => (
              <motion.div key={action.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}>
                <GovernanceCard action={action} onApprove={() => approve(action.id)} onDeny={() => deny(action.id)} />
              </motion.div>
            )) : (
              <div className="rounded-2xl border border-dashed border-surface-border bg-white p-16 text-center">
                <Vote className="h-10 w-10 text-surface-border mx-auto mb-3" />
                <p className="text-ink-muted font-semibold uppercase tracking-wider text-sm">No {tab} requests</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
