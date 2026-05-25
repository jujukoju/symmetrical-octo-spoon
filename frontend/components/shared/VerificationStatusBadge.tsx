"use client";
import { cn } from "@/lib/utils";
import type { VerificationStatus } from "@/lib/types";
import { CheckCircle2, Clock, XCircle, AlertTriangle, Shield } from "lucide-react";

interface Props {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const config: Record<VerificationStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  verified:     { label: "Verified",     color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  pending:      { label: "Pending",      color: "text-yellow-400",  bg: "bg-yellow-400/10 border-yellow-400/20",  icon: Clock },
  unregistered: { label: "Unregistered", color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20",   icon: Shield },
  suspended:    { label: "Suspended",    color: "text-orange-400",  bg: "bg-orange-400/10 border-orange-400/20", icon: AlertTriangle },
  rejected:     { label: "Rejected",     color: "text-red-400",     bg: "bg-red-400/10 border-red-400/20",       icon: XCircle },
};

const sizeMap = { sm: "text-xs px-2 py-0.5", md: "text-xs px-2.5 py-1", lg: "text-sm px-3 py-1.5" };
const iconSize = { sm: "h-3 w-3", md: "h-3.5 w-3.5", lg: "h-4 w-4" };

export function VerificationStatusBadge({ status, size = "md", showIcon = true, className }: Props) {
  const { label, color, bg, icon: Icon } = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", bg, color, sizeMap[size], className)}>
      {showIcon && <Icon className={iconSize[size]} />}
      {label}
    </span>
  );
}
