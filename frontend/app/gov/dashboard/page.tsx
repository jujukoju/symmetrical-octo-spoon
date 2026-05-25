"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3, TrendingUp, AlertTriangle, PauseCircle,
  CheckCircle2, XCircle, FileCheck, Clock, Shield, Users,
  Activity, Globe, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { verificationAnalytics, institutions } from "@/lib/mockData";
import { VerificationStatusBadge } from "@/components/shared/VerificationStatusBadge";

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

const systemStats = [
  { label: "Total Verifications", value: "18.7M", icon: FileCheck, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { label: "Registered Identities", value: "4.28M", icon: Users, color: "text-green", bg: "bg-green/5", border: "border-green/20" },
  { label: "Active Institutions", value: "312", icon: Globe, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  { label: "Flagged Anomalies", value: "7", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
];

const systemHealth = [
  { service: "Oracle API", status: "ok", latency: "42ms" },
  { service: "IPFS Node", status: "ok", latency: "120ms" },
  { service: "PostgreSQL", status: "ok", latency: "8ms" },
  { service: "ML Inference", status: "degraded", latency: "1.8s" },
];

export default function GovDashboardPage() {
  const [outliers, setOutliers] = useState([
    { id: "usr-092", nin: "****-****-112", verifications: 142, status: "verified" as const },
    { id: "usr-114", nin: "****-****-884", verifications: 89, status: "verified" as const },
    { id: "usr-201", nin: "****-****-330", verifications: 67, status: "verified" as const },
  ]);

  const suspend = (id: string) =>
    setOutliers(outliers.map((o) => o.id === id ? { ...o, status: "suspended" as any } : o));

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Government Portal</p>
          <h1 className="text-3xl font-bold text-ink">System Monitor</h1>
          <p className="text-ink-secondary text-sm mt-1">Real-time oversight of the NINAuth identity platform.</p>
        </motion.div>

        {/* Platform Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {systemStats.map(({ label, value, icon: Icon, color, bg, border }, i) => (
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

          {/* Left: Chart + Institutions */}
          <div className="lg:col-span-2 space-y-6">

            {/* Platform Volume Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-ink flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green" /> Platform Volume
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">Macro verification trends across all institutions</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={verificationAnalytics}>
                  <defs>
                    <linearGradient id="govVerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006B3F" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#006B3F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF0EB" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="verifications" name="Total Requests" stroke="#006B3F" strokeWidth={2} fill="url(#govVerGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top Institutions */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <h2 className="font-bold text-ink mb-5">Top Institutions by Volume</h2>
              <div className="space-y-4">
                {institutions.map((inst, i) => {
                  const pct = Math.round((inst.totalVerifications / 8_900_000) * 100);
                  return (
                    <div key={inst.id} className="flex items-center gap-4">
                      <span className="text-lg">{inst.logo}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm font-medium text-ink truncate">{inst.name}</p>
                          <p className="text-xs font-bold text-ink ml-2 shrink-0">{inst.totalVerifications.toLocaleString()}</p>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.4 + i * 0.1 }}
                            className="h-full rounded-full bg-green" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right */}
          <div className="space-y-6">

            {/* System Health */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <h2 className="font-bold text-ink mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-green" /> System Health
              </h2>
              <div className="space-y-3">
                {systemHealth.map((s) => (
                  <div key={s.service} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-soft px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-2 w-2 rounded-full ${s.status === "ok" ? "bg-green" : "bg-amber-400"}`} />
                      <span className="text-sm font-medium text-ink">{s.service}</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${s.status === "ok" ? "text-ink-muted" : "text-amber-600"}`}>
                      {s.latency}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/gov/radar" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-white py-2.5 text-xs font-semibold text-green hover:bg-green/5 transition-all shadow-sm">
                View Anomaly Radar &amp; Latency Trends <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            {/* Outlier Detection */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="font-bold text-red-900">Outlier Detection</h2>
              </div>
              <p className="text-xs text-red-700 mb-4">
                Identities with unusually high verification frequency in 24h. May indicate system abuse.
              </p>
              <div className="space-y-3">
                {outliers.map((o) => (
                  <div key={o.id} className="rounded-xl border border-red-200 bg-white p-3 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-mono font-bold text-ink">{o.nin}</span>
                      <VerificationStatusBadge status={o.status} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-ink-secondary">
                        Requests (24h): <strong className="text-red-600">{o.verifications}</strong>
                      </span>
                      {o.status === "verified" ? (
                        <button onClick={() => suspend(o.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                          <PauseCircle className="h-3 w-3" /> Suspend
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">Suspended</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/gov/audit" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-all shadow-sm">
                Inspect System Audit Logs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
