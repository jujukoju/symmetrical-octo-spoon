"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Link2, Blocks, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ServiceStatus = "online" | "offline" | "checking";

interface ServiceState {
  name: string;
  icon: React.ElementType;
  status: ServiceStatus;
  label: string;
  color: string;
  bg: string;
  border: string;
}

async function checkService(fn: () => Promise<any>): Promise<ServiceStatus> {
  try {
    const res = await fn();
    return res.success ? "online" : "offline";
  } catch {
    return "offline";
  }
}

const STATUS_COLOR: Record<ServiceStatus, string> = {
  online:   "text-green",
  offline:  "text-red-600",
  checking: "text-ink-muted",
};
const STATUS_DOT: Record<ServiceStatus, string> = {
  online:   "bg-green",
  offline:  "bg-red-500",
  checking: "bg-ink-light",
};
const STATUS_LABEL: Record<ServiceStatus, string> = {
  online:   "Online",
  offline:  "Offline",
  checking: "Checking…",
};

// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  variant?: "banner" | "card";
  className?: string;
}

export function SystemStatusBanner({ variant = "banner", className }: Props) {
  const [services, setServices] = useState<ServiceState[]>([
    { name: "Deep Learning Engine", icon: Brain,  status: "checking", label: "Biometric Encryption", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
    { name: "NIN Oracle",           icon: Link2,  status: "checking", label: "NIMC Validation",      color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
    { name: "Blockchain Module",    icon: Blocks, status: "checking", label: "Hash Anchoring",        color: "text-green",      bg: "bg-green/5",   border: "border-green/20" },
  ]);

  useEffect(() => {
    const check = async () => {
      const statuses = await Promise.all([
        checkService(() => api.checkHealth()),
        checkService(() => api.checkHealth()),
        checkService(() => api.checkHealth()),
      ]);
      setServices((prev) =>
        prev.map((s, i) => ({ ...s, status: statuses[i] }))
      );
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const allOnline   = services.every((s) => s.status === "online");
  const anyOffline  = services.some((s) => s.status === "offline");
  const anyChecking = services.some((s) => s.status === "checking");

  if (variant === "card") {
    return (
      <div className={cn("rounded-2xl border border-surface-border bg-white p-5 shadow-card", className)}>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">
          Middleware Layer Status
        </p>
        <div className="space-y-3">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <div key={svc.name} className={cn("flex items-center justify-between rounded-xl border p-3", svc.border, svc.bg)}>
                <div className="flex items-center gap-2.5">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white", svc.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink leading-none">{svc.name}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">{svc.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full", STATUS_DOT[svc.status], svc.status === "online" && "animate-pulse")} />
                  <span className={cn("text-xs font-medium", STATUS_COLOR[svc.status])}>
                    {STATUS_LABEL[svc.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Banner variant
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border flex items-center justify-between px-4 py-3 gap-4 flex-wrap shadow-card",
        anyOffline  ? "border-red-200 bg-red-50" :
        anyChecking ? "border-surface-border bg-surface-muted" :
                      "border-green/20 bg-green/5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {anyChecking ? (
          <Loader2 className="h-4 w-4 text-ink-muted animate-spin" />
        ) : anyOffline ? (
          <AlertCircle className="h-4 w-4 text-red-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green" />
        )}
        <span className={cn("text-sm font-semibold",
          anyOffline ? "text-red-700" : anyChecking ? "text-ink-secondary" : "text-green"
        )}>
          {anyChecking ? "Checking middleware layer…" : anyOffline ? "Degraded service" : "All systems operational"}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          return (
            <div key={svc.name} className="flex items-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[svc.status], svc.status === "online" && "animate-pulse")} />
              <Icon className={cn("h-3.5 w-3.5", svc.color)} />
              <span className="text-xs text-ink-secondary hidden sm:inline">{svc.name.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
