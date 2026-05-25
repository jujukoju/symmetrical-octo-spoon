"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, CheckCircle2, XCircle, Clock, TrendingUp,
  Shield, Building2, ArrowRight, Users,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend,
} from "recharts";
import { institutions, verificationAnalytics, dashboardStats } from "@/lib/mockData";

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

const statsCards = [
  { label: "Total Verifications", value: "2,340,000", icon: CheckCircle2, color: "text-green",     bg: "bg-green/5",  border: "border-green/20" },
  { label: "Pending Approvals",   value: "1,243",     icon: Clock,        color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "Failed Attempts",     value: "87",        icon: XCircle,      color: "text-red-700",   bg: "bg-red-50",   border: "border-red-200" },
  { label: "Active Channels",     value: "3",         icon: Shield,       color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200" },
];

const recentVerifications = [
  { id: "v-001", nin: "****-****-901", result: "MATCH",    time: "2 min ago",  level: 3, score: "97%" },
  { id: "v-002", nin: "****-****-442", result: "MATCH",    time: "8 min ago",  level: 2, score: "94%" },
  { id: "v-003", nin: "****-****-773", result: "NO_MATCH", time: "15 min ago", level: 3, score: "41%" },
  { id: "v-004", nin: "****-****-128", result: "MATCH",    time: "1 hr ago",   level: 2, score: "99%" },
];

export default function InstitutionDashboardPage() {
  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Institution Portal</p>
          <h1 className="text-3xl font-bold text-ink">Verification Analytics</h1>
          <p className="text-ink-secondary text-sm mt-1">Real-time overview of your institution's identity verification activity.</p>
        </motion.div>

        {/* Stats */}
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

          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-ink flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green" /> Monthly Verification Volume
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">Approvals vs Denials over time</p>
                </div>
                <TrendingUp className="h-5 w-5 text-green" />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={verificationAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBF0EB" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7F6E", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="approvals" name="Approved" fill="#006B3F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="denials" name="Denied" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Recent Verifications */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-ink">Recent Verifications</h2>
                <Link href="/institution/audit" className="text-xs text-green hover:text-green-dark transition-colors flex items-center gap-1 font-medium">
                  Full audit log <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {recentVerifications.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-soft p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold
                      ${v.result === "MATCH" ? "bg-green/10 text-green" : "bg-red-100 text-red-700"}`}>
                      {v.result === "MATCH" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-mono font-medium text-ink">{v.nin}</p>
                      <p className="text-xs text-ink-muted">Level {v.level} · Score: {v.score}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${v.result === "MATCH" ? "text-green" : "text-red-600"}`}>{v.result}</p>
                      <p className="text-xs text-ink-light">{v.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-green/20 bg-green/5 p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-green mb-4">Quick Actions</p>
              <div className="space-y-3">
                <Link href="/institution/verify"
                  className="flex items-center gap-3 rounded-xl border border-green/20 bg-white p-4 hover:border-green/40 hover:bg-green/5 transition-all group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green text-white group-hover:bg-green-dark transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">Verify a Citizen</p>
                    <p className="text-xs text-ink-muted">Run identity check</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted ml-auto" />
                </Link>
                <Link href="/institution/audit"
                  className="flex items-center gap-3 rounded-xl border border-surface-border bg-white p-4 hover:border-green/40 hover:bg-surface-soft transition-all group">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-ink-muted group-hover:text-green transition-colors">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">Audit Logs</p>
                    <p className="text-xs text-ink-muted">View all records</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-muted ml-auto" />
                </Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
              <h2 className="font-bold text-ink mb-4 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-green" /> Access Level Permissions
              </h2>
              <div className="space-y-2">
                {[
                  { level: "L1", desc: "Identity Confirmation", active: true },
                  { level: "L2", desc: "Name & Photo",         active: true },
                  { level: "L3", desc: "Demographics",         active: true },
                  { level: "L4", desc: "Address & NIN",        active: false },
                  { level: "L5", desc: "Full Disclosure",      active: false },
                ].map((l) => (
                  <div key={l.level} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${l.active ? "bg-green/5 border border-green/15" : "bg-surface-soft border border-surface-border opacity-50"}`}>
                    <span className={`text-xs font-bold ${l.active ? "text-green" : "text-ink-muted"}`}>{l.level}</span>
                    <span className="text-xs text-ink">{l.desc}</span>
                    {l.active && <CheckCircle2 className="h-3.5 w-3.5 text-green ml-auto" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}
