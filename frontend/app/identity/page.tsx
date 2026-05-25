"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Copy, CheckCircle2, MapPin, Calendar, User,
  Download, Clock, Eye, EyeOff, Lock, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { VerificationStatusBadge } from "@/components/shared/VerificationStatusBadge";
import { BiometricScoreIndicator } from "@/components/shared/BiometricScoreIndicator";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { AccessRequestCard } from "@/components/shared/AccessRequestCard";
import { verificationRequests } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { formatDate, getRiskColor, getRiskLabel } from "@/lib/utils";
import { getDisclosedFields, getLevelDescription } from "@/lib/data-access";
import { AccessLevel } from "@/lib/types";
import { RoleGuard } from "@/components/shared/RoleGuard";

const timelineSteps = [
  { label: "Registered", done: true, date: "1 Feb 2024" },
  { label: "Submitted", done: true, date: "1 Feb 2024" },
  { label: "Verified", done: true, date: "15 Mar 2024" },
  { label: "Active", done: true, date: "15 Mar 2024" },
];

export default function IdentityPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(5);
  const pendingRequests = verificationRequests.filter((r) => r.status === "pending");

  const copyNIN = () => {
    navigator.clipboard.writeText(user.nin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const disclosedFields = getDisclosedFields(user, accessLevel);

  return (
    <RoleGuard allowedRoles={["citizen", "government"]}>
      <div className="min-h-screen bg-surface-soft bg-grid py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* ── Access Level Simulator (Floating Card) ── */}
          <div className="sticky top-20 z-40 mb-8 rounded-2xl border border-green/20 bg-white/80 backdrop-blur-md p-4 shadow-green-md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green leading-none mb-1">Information Access Guard</p>
                  <p className="text-sm font-semibold text-ink">Simulating Level {accessLevel} Disclosure</p>
                </div>
              </div>
              <div className="flex flex-1 max-w-md items-center gap-4 px-4">
                <span className="text-xs font-bold text-ink-muted">L1</span>
                <input
                  type="range" min="1" max="5" step="1"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(parseInt(e.target.value) as AccessLevel)}
                  className="w-full h-1.5 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-green"
                />
                <span className="text-xs font-bold text-green">L5</span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-ink-secondary italic">{getLevelDescription(accessLevel)}</p>
              </div>
            </div>
          </div>

          {/* ── Profile Header ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 overflow-hidden rounded-2xl border border-surface-border bg-white p-6 sm:p-8 shadow-card">
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-muted ring-2 ring-surface-border text-3xl font-bold text-green">
                  {user.firstName[0]}{user.surname[0]}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green text-white ring-2 ring-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Identity info */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-ink">
                    {accessLevel >= 2 ? user.fullName : "●●●●●● ●●●●●●"}
                  </h1>
                  <VerificationStatusBadge status={user.verificationStatus} />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
                  <button onClick={copyNIN}
                    className="flex items-center gap-1.5 font-mono hover:text-green transition-colors disabled:opacity-50"
                    disabled={accessLevel < 4}>
                    <Shield className="h-3.5 w-3.5" />
                    NIN: {accessLevel >= 4 ? (accessLevel === 5 ? user.nin : user.ninMasked) : "••••-••••-•••"}
                    {accessLevel >= 4 && (copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green" /> : <Copy className="h-3.5 w-3.5" />)}
                  </button>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {accessLevel >= 4 ? user.stateOfResidence : "••••••"}, Nigeria
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {user.verifiedAt ? `Verified ${formatDate(user.verifiedAt)}` : "Not yet verified"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-white px-3 py-2 text-xs text-ink-secondary hover:text-green hover:border-green/40 transition-all shadow-sm">
                  <Download className="h-3.5 w-3.5" /> Export ID
                </button>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column ───────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Identity Attributes */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-5 flex items-center gap-2">
                  <User className="h-4 w-4" /> Identity Data Disclosure
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {disclosedFields.map((attr) => (
                    <div key={attr.field} className={cn(
                      "rounded-xl border p-4 transition-all duration-300",
                      attr.isMasked ? "bg-surface-muted/50 border-surface-border/50 opacity-60" : "bg-white border-surface-border"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{attr.label}</p>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                          accessLevel >= attr.levelRequired ? "bg-green/10 text-green border-green/20" : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          L{attr.levelRequired}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium font-mono truncate",
                          attr.isMasked ? "text-ink-light" : "text-ink"
                        )}>
                          {attr.value}
                        </p>
                        {attr.isMasked ? (
                          <Lock className="h-3.5 w-3.5 text-ink-light shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Biometric Verification Panel */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-5 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Biometric Verification
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {user.biometrics.map((b) => (
                    <div key={b.type} className={cn(
                      "transition-all duration-300",
                      accessLevel < 5 && b.type !== "fingerprint" ? "opacity-30 blur-[1px]" : ""
                    )}>
                      <BiometricScoreIndicator {...b} />
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Documents */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-5">Documents Vault</h2>
                {accessLevel < 4 ? (
                  <div className="rounded-xl border border-dashed border-surface-border p-12 text-center">
                    <EyeOff className="h-10 w-10 text-ink-light mx-auto mb-3" />
                    <p className="text-sm text-ink-secondary font-medium">Vault access restricted</p>
                    <p className="text-xs text-ink-muted mt-1">Requires Level 4 Access</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.documents.map((doc) => (
                      <DocumentCard key={doc.id} document={doc} />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── Right column ──────────────────────────────────────────── */}
            <div className="space-y-6">

              {/* Verification Timeline */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-6 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Verification Timeline
                </h2>
                <div className="relative pl-6 space-y-6">
                  {timelineSteps.map((step, i) => (
                    <div key={step.label} className="relative">
                      {i < timelineSteps.length - 1 && (
                        <div className="absolute left-[-17px] top-6 h-full w-0.5 bg-gradient-to-b from-green to-surface-muted" />
                      )}
                      <div className={`absolute left-[-21px] top-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${step.done ? "bg-green text-white" : "bg-surface-muted text-ink-muted"}`}>
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${step.done ? "text-ink" : "text-ink-muted"}`}>{step.label}</p>
                        <p className="text-xs text-ink-muted">{step.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Risk Score */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="rounded-2xl border border-green/20 bg-green/5 p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wider text-green mb-3">AI Risk Score</p>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-5xl font-black text-green">{user.riskScore}</span>
                  <span className="text-sm text-ink-muted mb-1">/100 — {getRiskLabel(user.riskScore)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${user.riskScore}%` }}
                    transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full bg-green" />
                </div>
              </motion.div>

              {/* Access Control — Pending requests (Only for Citizen) */}
              <AnimatePresence>
                {pendingRequests.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl border border-surface-border bg-white p-6 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Pending Access</h2>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 uppercase">
                        {pendingRequests.length} New
                      </span>
                    </div>
                    <div className="space-y-4">
                      {pendingRequests.slice(0, 2).map((req) => (
                        <AccessRequestCard key={req.id} request={req} showActions />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
