"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FileCheck, CheckCircle2, XCircle, Search, Filter, Download } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const auditLogs = [
  { id: "a-001", nin: "****-****-901", action: "VERIFY", decision: "MATCH",    level: 3, score: "97%", ip: "172.16.0.10", timestamp: "2024-05-17T14:23:00Z", operator: "KYC-Bot-01" },
  { id: "a-002", nin: "****-****-442", action: "VERIFY", decision: "MATCH",    level: 2, score: "94%", ip: "172.16.0.10", timestamp: "2024-05-17T13:15:00Z", operator: "KYC-Bot-01" },
  { id: "a-003", nin: "****-****-773", action: "VERIFY", decision: "NO_MATCH", level: 3, score: "41%", ip: "172.16.0.11", timestamp: "2024-05-17T12:05:00Z", operator: "KYC-Bot-02" },
  { id: "a-004", nin: "****-****-128", action: "VERIFY", decision: "MATCH",    level: 2, score: "99%", ip: "172.16.0.10", timestamp: "2024-05-17T10:00:00Z", operator: "KYC-Bot-01" },
  { id: "a-005", nin: "****-****-501", action: "VERIFY", decision: "MATCH",    level: 1, score: "88%", ip: "172.16.0.12", timestamp: "2024-05-16T16:45:00Z", operator: "KYC-Bot-03" },
  { id: "a-006", nin: "****-****-664", action: "VERIFY", decision: "NO_MATCH", level: 3, score: "32%", ip: "172.16.0.11", timestamp: "2024-05-16T15:00:00Z", operator: "KYC-Bot-02" },
];

export default function InstitutionAuditPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "MATCH" | "NO_MATCH">("all");

  const filtered = auditLogs.filter((l) => {
    const matchSearch = l.nin.includes(search) || l.operator.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.decision === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Institution Portal</p>
          <h1 className="text-3xl font-bold text-ink">Audit Logs</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Immutable record of all verification actions. Compliant with NDPR data access requirements.
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input type="text" placeholder="Search by NIN or operator…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-surface-border pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green/20 focus:border-green outline-none transition-all" />
          </div>
          <div className="flex gap-2">
            {(["all", "MATCH", "NO_MATCH"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                  filter === f ? "bg-green text-white shadow-green-sm" : "bg-white border border-surface-border text-ink-secondary hover:border-green/40"
                }`}>
                {f === "all" ? "All" : f === "MATCH" ? "✓ Match" : "✗ No Match"}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm font-medium text-ink-secondary hover:bg-surface-soft transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-surface-border bg-white shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-soft">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">NIN</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Decision</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Score</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Level</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Operator</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map((log, i) => (
                  <motion.tr key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-surface-soft transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-ink">{log.nin}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold
                        ${log.decision === "MATCH" ? "bg-green/10 text-green" : "bg-red-100 text-red-700"}`}>
                        {log.decision === "MATCH"
                          ? <><CheckCircle2 className="h-3 w-3" /> MATCH</>
                          : <><XCircle className="h-3 w-3" /> NO MATCH</>
                        }
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-bold text-sm ${log.decision === "MATCH" ? "text-green" : "text-red-600"}`}>
                        {log.score}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-ink">L{log.level}</span>
                    </td>
                    <td className="px-5 py-4 text-ink-secondary text-xs">{log.operator}</td>
                    <td className="px-5 py-4 text-ink-muted text-xs">{timeAgo(log.timestamp)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <FileCheck className="h-10 w-10 text-ink-muted mx-auto mb-3" />
              <p className="text-ink-secondary text-sm">No audit records found.</p>
            </div>
          )}
        </motion.div>

        <p className="text-center text-xs text-ink-muted">
          Showing {filtered.length} of {auditLogs.length} audit records · Data retained for 7 years per NDPR compliance
        </p>
      </div>
    </div>
  );
}
