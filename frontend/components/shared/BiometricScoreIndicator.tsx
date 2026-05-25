"use client";
import { motion } from "framer-motion";
import { cn, getRiskColor, getRiskLabel } from "@/lib/utils";
import type { BiometricType } from "@/lib/types";
import { Fingerprint, Scan, Eye } from "lucide-react";

interface Props {
  type: BiometricType;
  score: number;
  status: "enrolled" | "not_enrolled" | "failed";
  livenessCheck: boolean;
}

const typeConfig: Record<BiometricType, { label: string; icon: typeof Fingerprint }> = {
  fingerprint: { label: "Fingerprint", icon: Fingerprint },
  face:        { label: "Face Scan",   icon: Scan },
  iris:        { label: "Iris Scan",   icon: Eye },
};

export function BiometricScoreIndicator({ type, score, status, livenessCheck }: Props) {
  const { label, icon: Icon } = typeConfig[type];
  const enrolled = status === "enrolled";

  return (
    <div className={cn(
      "relative rounded-xl border p-4 transition-all duration-300",
      enrolled ? "border-gold/20 bg-gold/5" : "border-charcoal-border bg-charcoal-mid/50"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg",
            enrolled ? "bg-gold/15 text-gold" : "bg-charcoal-mid text-slate-500")}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{label}</p>
            <p className={cn("text-xs", enrolled ? "text-emerald-400" : "text-slate-500")}>
              {status === "enrolled" ? "Enrolled" : status === "failed" ? "Failed" : "Not enrolled"}
            </p>
          </div>
        </div>
        {enrolled && (
          <div className="text-right">
            <p className={cn("text-lg font-bold", score >= 90 ? "text-emerald-400" : score >= 70 ? "text-yellow-400" : "text-red-400")}>
              {score}%
            </p>
            <p className="text-xs text-slate-500">confidence</p>
          </div>
        )}
      </div>

      {enrolled && (
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-full bg-charcoal-mid overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className={cn("h-full rounded-full", score >= 90 ? "bg-emerald-400" : score >= 70 ? "bg-yellow-400" : "bg-red-400")}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Liveness</span>
            <span className={cn("text-xs font-medium", livenessCheck ? "text-emerald-400" : "text-red-400")}>
              {livenessCheck ? "✓ Passed" : "✗ Failed"}
            </span>
          </div>
        </div>
      )}

      {!enrolled && (
        <div className="h-1.5 w-full rounded-full bg-charcoal-mid">
          <div className="h-full w-0 rounded-full bg-charcoal-border" />
        </div>
      )}
    </div>
  );
}
