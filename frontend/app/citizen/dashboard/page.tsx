"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileCheck, Clock, CheckCircle2, XCircle, Shield, User,
  TrendingUp, ArrowRight, BarChart3, Fingerprint, AlertTriangle, PauseCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { dashboardStats, verificationAnalytics, accessLogs, currentUser } from "@/lib/mockData";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { VerificationStatusBadge } from "@/components/shared/VerificationStatusBadge";
import { timeAgo, getRiskColor, getRiskLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const statsCards = [
  { label: "Total Verifications", value: dashboardStats.totalVerifications, icon: FileCheck, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { label: "Approved Requests", value: dashboardStats.approvedRequests, icon: CheckCircle2, color: "text-green", bg: "bg-green/5", border: "border-green/20" },
  { label: "Pending Approvals", value: dashboardStats.pendingApprovals, icon: Clock, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "Denied Requests", value: dashboardStats.deniedRequests, icon: XCircle, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-surface-border bg-white p-3 text-xs shadow-green-md">
      <p className="text-ink-muted mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function CitizenDashboardPage() {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Citizen Account</p>
          <h1 className="text-3xl font-bold text-ink">Welcome back, {currentUser.firstName}</h1>
          <p className="text-ink-secondary text-sm mt-1">Last activity {timeAgo(dashboardStats.lastActivity)}</p>
        </motion.div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map(({ label, value, icon: Icon, color, bg, border }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-2xl border ${border} ${bg} p-5 shadow-card`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className={`text-3xl font-black ${color} mb-1`}>{value}</p>
              <p className="text-xs text-ink-secondary">{label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Verification Analytics Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-ink flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green" /> Verification Analytics
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">Last 5 months activity</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={verificationAnalytics}>
                  <defs>
                    <linearGradient id="citizenVerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006B3F" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#006B3F" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="citizenApprovalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008751" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#008751" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF0EB" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#3D5240" }} />
                  <Area type="monotone" dataKey="verifications" name="Total" stroke="#006B3F" strokeWidth={2} fill="url(#citizenVerGrad)" dot={false} />
                  <Area type="monotone" dataKey="approvals" name="Approved" stroke="#008751" strokeWidth={2} fill="url(#citizenApprovalGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Access History */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-ink">Recent Access History</h2>
                <Link href="/citizen/requests" className="text-xs text-green hover:text-green-dark transition-colors flex items-center gap-1 font-medium">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {accessLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-soft p-3 hover:border-green/25 transition-all">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold
                      ${log.action === "approved" ? "bg-green/10 text-green" :
                        log.action === "denied" || log.action === "revoked" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"}`}>
                      {log.institutionName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{log.institutionName}</p>
                      <p className="text-xs text-ink-muted truncate">{log.dataScope.slice(0, 2).join(", ")}{log.dataScope.length > 2 ? " +" + (log.dataScope.length - 2) : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold capitalize
                        ${log.action === "approved" ? "text-green" :
                          log.action === "denied" || log.action === "revoked" ? "text-red-600" :
                            "text-amber-700"}`}>{log.action}</p>
                      <p className="text-xs text-ink-light">{timeAgo(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">

            {/* My Identity Quick Card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-green/20 bg-green/5 p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-green mb-4">My Identity</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green text-white font-bold text-lg">
                  {currentUser.firstName[0]}{currentUser.surname?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-ink">{currentUser.fullName}</p>
                  <p className="text-xs font-mono text-green">{currentUser.ninMasked}</p>
                </div>
              </div>
              <VerificationStatusBadge status={currentUser.verificationStatus} />

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-green/15 bg-green/5 px-3 py-2">
                <Fingerprint className="h-3.5 w-3.5 text-green shrink-0" />
                <span className="text-[10px] text-green font-semibold">Device Passkey Enrolled</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-white p-3 border border-surface-border">
                  <p className="text-lg font-bold text-ink">{dashboardStats.documentsVaulted}</p>
                  <p className="text-xs text-ink-secondary">Documents</p>
                </div>
                <div className="rounded-lg bg-white p-3 border border-surface-border">
                  <p className="text-lg font-bold text-ink">{dashboardStats.institutionsConnected}</p>
                  <p className="text-xs text-ink-secondary">Institutions</p>
                </div>
              </div>
              <Link href="/citizen/identity"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-green/30 bg-white py-2.5 text-sm font-semibold text-green hover:bg-green/5 transition-all">
                <User className="h-4 w-4" /> View Full Profile
              </Link>
            </motion.div>

            {/* AI Risk Score */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4" /> AI Risk Score
              </p>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-4xl font-black ${getRiskColor(currentUser.riskScore)}`}>
                  {currentUser.riskScore}
                </span>
                <span className={`text-sm font-medium ${getRiskColor(currentUser.riskScore)}`}>
                  {getRiskLabel(currentUser.riskScore)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${currentUser.riskScore}%` }}
                  transition={{ duration: 1.2, delay: 0.6 }}
                  className="h-full rounded-full bg-green" />
              </div>
              <p className="text-[10px] text-ink-muted mt-2">Based on verification history and activity patterns.</p>
            </motion.div>

            {/* Documents Vault mini */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-ink text-sm">Documents Vault</h2>
                <Link href="/citizen/identity" className="text-xs text-green hover:text-green-dark transition-colors font-medium">View all</Link>
              </div>
              <div className="space-y-3">
                {currentUser.documents.filter((d) => d.status !== "locked").map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}