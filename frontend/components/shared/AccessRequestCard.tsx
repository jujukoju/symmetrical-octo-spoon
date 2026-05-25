"use client";
import { motion } from "framer-motion";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import type { VerificationRequest } from "@/lib/types";
import { Building2, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, Shield } from "lucide-react";

interface Props {
  request: VerificationRequest;
  onApprove?: () => void;
  onDeny?: () => void;
  showActions?: boolean;
}

const statusConfig = {
  pending:  { color: "text-yellow-400",  bg: "bg-yellow-400/10 border-yellow-400/20",  icon: Clock,         label: "Pending" },
  approved: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2, label: "Approved" },
  denied:   { color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20",         icon: XCircle,      label: "Denied" },
  expired:  { color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20",     icon: AlertTriangle,label: "Expired" },
};

const riskConfig = {
  low:      { color: "text-emerald-400", bg: "bg-emerald-400/10" },
  medium:   { color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  high:     { color: "text-orange-400",  bg: "bg-orange-400/10" },
  critical: { color: "text-red-400",     bg: "bg-red-400/10" },
};

export function AccessRequestCard({ request, onApprove, onDeny, showActions = false }: Props) {
  const sc = statusConfig[request.status];
  const rc = riskConfig[request.riskLevel];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-charcoal-border bg-charcoal-light p-5 hover:border-gold/20 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal-mid border border-charcoal-border text-2xl">
            {request.institution.logo}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{request.institution.name}</p>
            <p className="text-xs text-slate-500">{timeAgo(request.requestedAt)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", sc.bg, sc.color)}>
            <StatusIcon className="h-3 w-3" />
            {sc.label}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", rc.bg, rc.color)}>
            {request.riskLevel} risk
          </span>
        </div>
      </div>

      {/* Purpose */}
      <p className="text-sm text-slate-300 mb-3">{request.purpose}</p>

      {/* Requested data */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <Shield className="h-3 w-3" /> Requested data
        </p>
        <div className="flex flex-wrap gap-1.5">
          {request.requestedScope.map((scope) => (
            <span key={scope} className="rounded-md bg-charcoal-mid border border-charcoal-border px-2 py-0.5 text-xs text-slate-300 font-mono">
              {scope.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          Expires {formatDate(request.expiresAt)}
        </div>
        {request.blockchainTxHash && (
          <span className="text-xs font-mono text-gold/50">{request.blockchainTxHash}</span>
        )}
      </div>

      {/* Actions */}
      {showActions && request.status === "pending" && (
        <div className="mt-4 flex gap-2.5 border-t border-charcoal-border pt-4">
          <button onClick={onApprove}
            className="flex-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-400/20 transition-all">
            ✓ Approve
          </button>
          <button onClick={onDeny}
            className="flex-1 rounded-lg bg-red-400/10 border border-red-400/20 py-2 text-sm font-semibold text-red-400 hover:bg-red-400/20 transition-all">
            ✗ Deny
          </button>
        </div>
      )}
    </motion.div>
  );
}
