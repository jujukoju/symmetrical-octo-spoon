"use client";
import { motion } from "framer-motion";
import { Brain, Link2, Blocks, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  activeStage?: number; // 0=idle, 1=DL, 2=Oracle, 3=Blockchain, -1=done
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

const stages = [
  { id: 1, icon: Brain,  label: "DL Engine",  sublabel: "Biometric Encryption",  color: "text-violet-700", bg: "bg-violet-50",   border: "border-violet-200", dot: "bg-violet-600" },
  { id: 2, icon: Link2,  label: "NIN Oracle",  sublabel: "NIMC Validation",       color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200",   dot: "bg-blue-600" },
  { id: 3, icon: Blocks, label: "Blockchain",  sublabel: "Hash Anchoring",         color: "text-green",      bg: "bg-green/5",     border: "border-green/20",   dot: "bg-green" },
];

export function MiddlewarePipeline({ activeStage = 0, compact = false, animated = false, className }: Props) {
  if (compact) {
    return (
      <div className={cn("rounded-xl border border-surface-border bg-white p-3 shadow-card", className)}>
        <p className="text-[9px] font-bold uppercase tracking-wider text-ink-muted mb-2">Middleware Pipeline</p>
        <div className="flex items-center gap-1">
          {stages.map((s, i) => {
            const Icon = s.icon;
            const active = activeStage === s.id;
            const done   = activeStage === -1 || activeStage > s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-all duration-300",
                  done   ? "bg-green/10" :
                  active ? s.bg :
                           "bg-surface-soft"
                )}>
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green" />
                  ) : active ? (
                    <Loader2 className={cn("h-3.5 w-3.5 animate-spin", s.color)} />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-ink-light" />
                  )}
                </div>
                <span className={cn("text-[9px] font-semibold truncate",
                  done ? "text-green" : active ? s.color : "text-ink-muted"
                )}>{s.label}</span>
                {i < stages.length - 1 && (
                  <div className={cn("h-px flex-1 mx-1 transition-colors", done ? "bg-green/30" : "bg-surface-border")} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-surface-border bg-white p-5 shadow-card", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4">
        Middleware Pipeline — Processing
      </p>
      <div className="grid grid-cols-3 gap-3">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const active = activeStage === s.id;
          const done   = activeStage === -1 || activeStage > s.id;

          return (
            <div key={s.id} className="flex flex-col items-center text-center gap-2 relative">
              {/* Connector */}
              {i < stages.length - 1 && (
                <div className={cn(
                  "absolute right-[-10%] top-5 w-[20%] h-px hidden sm:block transition-colors duration-500",
                  done ? "bg-green/40" : "bg-surface-border"
                )} />
              )}

              <motion.div
                animate={active ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.8, repeat: active ? Infinity : 0 }}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300",
                  done   ? "bg-green/8 border-green/25" :
                  active ? `${s.bg} ${s.border}` :
                           "bg-surface-soft border-surface-border"
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-6 w-6 text-green" />
                ) : active ? (
                  <Loader2 className={cn("h-6 w-6 animate-spin", s.color)} />
                ) : (
                  <Icon className="h-6 w-6 text-ink-light" />
                )}
              </motion.div>

              <p className={cn("text-xs font-bold leading-none",
                done ? "text-green" : active ? s.color : "text-ink-secondary"
              )}>{s.label}</p>
              <p className="text-[9px] text-ink-muted leading-none">{s.sublabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
