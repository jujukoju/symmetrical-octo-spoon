"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck, Shield, Clock, Search, Filter, CheckCircle2,
  XCircle, ArrowDownRight, Globe, Info, RefreshCw
} from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { cn } from "@/lib/utils";

// Mock audit data reflecting db_models.py class AuditLog structure
const initialAuditLogs = [
  {
    id: "log-uuid-101",
    request_id: "req-7ea6-42d1-80a5-298da1c54b67",
    nin: "12345678901",
    action: "enroll",
    decision: null,
    distance: null,
    ip_address: "192.168.1.100",
    success: true,
    error_detail: null,
    created_at: "2026-05-25T12:44:00Z"
  },
  {
    id: "log-uuid-102",
    request_id: "req-f8a1-8e29-9e81-da818aa21852",
    nin: "12345678901",
    action: "verify",
    decision: "MATCH",
    distance: 0.0762,
    ip_address: "192.168.1.102",
    success: true,
    error_detail: null,
    created_at: "2026-05-25T11:22:15Z"
  },
  {
    id: "log-uuid-103",
    request_id: "req-f8a1-8e30-b912-1f81ea209bc2",
    nin: "12345678901",
    action: "verify",
    decision: "NO_MATCH",
    distance: 0.4498,
    ip_address: "192.168.1.102",
    success: true,
    error_detail: null,
    created_at: "2026-05-24T18:05:42Z"
  },
  {
    id: "log-uuid-104",
    request_id: "req-33da-429d-bb82-c288d2288ab2",
    nin: "98765432101",
    action: "enroll",
    decision: null,
    distance: null,
    ip_address: "192.168.1.110",
    success: false,
    error_detail: "validation_error (NIN checksum check failed)",
    created_at: "2026-05-24T15:30:10Z"
  },
  {
    id: "log-uuid-105",
    request_id: "req-99ab-c112-aa11-1a980bb291a2",
    nin: "11122233344",
    ip_address: "192.168.1.55",
    action: "verify",
    decision: null,
    distance: null,
    success: false,
    error_detail: "not_enrolled (NIN template not found in database)",
    created_at: "2026-05-23T09:12:00Z"
  }
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(initialAuditLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "enroll" | "verify">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<typeof initialAuditLogs[0] | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.nin.includes(searchTerm) ||
      log.request_id.includes(searchTerm) ||
      (log.ip_address && log.ip_address.includes(searchTerm)) ||
      (log.error_detail && log.error_detail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "success" && log.success) ||
      (statusFilter === "failed" && !log.success);

    return matchesSearch && matchesAction && matchesStatus;
  });

  return (
    <RoleGuard allowedRoles={["government"]}>
      <div className="min-h-screen bg-surface-soft py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">NIMC Official Gov Portal</p>
            <h1 className="text-3xl font-bold text-ink">Blockchain Access &amp; Audit Logs</h1>
            <p className="text-ink-secondary text-sm mt-1">
              Append-only audit trail mapping all biometric identity verification calls and enrollment requests.
            </p>
          </motion.div>

          {/* Filter Bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-surface-border bg-white p-5 shadow-card flex flex-col md:flex-row gap-4 justify-between items-center"
          >
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                placeholder="Search by NIN, Request ID, or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-white pl-10 pr-4 py-2.5 text-xs text-ink focus:border-green focus:ring-1 focus:ring-green outline-none"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
            </div>

            {/* Action & Status Selects */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <div className="flex items-center gap-1.5 border border-surface-border rounded-xl px-3 py-2 bg-white">
                <Filter className="h-3.5 w-3.5 text-ink-light" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as any)}
                  className="text-xs text-ink-secondary bg-transparent focus:outline-none"
                >
                  <option value="all">All Actions</option>
                  <option value="enroll">Enrollments</option>
                  <option value="verify">Verifications</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 border border-surface-border rounded-xl px-3 py-2 bg-white">
                <Shield className="h-3.5 w-3.5 text-ink-light" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs text-ink-secondary bg-transparent focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Audit Log Table */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 rounded-2xl border border-surface-border bg-white shadow-card overflow-hidden"
            >
              <div className="p-5 border-b border-surface-border bg-white flex justify-between items-center">
                <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                  <FileCheck className="h-4.5 w-4.5 text-green" /> Audit Records ({filteredLogs.length})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-soft border-b border-surface-border text-[9px] font-bold text-ink-muted uppercase tracking-wider">
                      <th className="py-3.5 px-5">Timestamp</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">NIN</th>
                      <th className="py-3.5 px-4">Outcome</th>
                      <th className="py-3.5 px-5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border/50 text-xs">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={cn(
                            "hover:bg-surface-soft/60 cursor-pointer transition-colors",
                            selectedLog?.id === log.id ? "bg-green/5" : ""
                          )}
                        >
                          <td className="py-4 px-5 font-mono text-[10px] text-ink-secondary">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 font-bold capitalize">
                            <span className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              log.action === "enroll" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-violet-50 text-violet-700 border border-violet-100"
                            )}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-ink-secondary">
                            ****-****-{log.nin.slice(-3)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 font-bold",
                              log.success ? "text-green" : "text-red-600"
                            )}>
                              {log.success ? (
                                <><CheckCircle2 className="h-3.5 w-3.5" /> Success</>
                              ) : (
                                <><XCircle className="h-3.5 w-3.5" /> Failed</>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right font-bold text-green hover:underline">
                            View details
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-ink-muted">
                          No audit records found matching search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Selected Audit Log Details Panel */}
            <AnimatePresence mode="wait">
              {selectedLog ? (
                <motion.div
                  key={selectedLog.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="rounded-2xl border border-surface-border bg-white p-6 shadow-card space-y-5"
                >
                  <div className="flex justify-between items-center border-b border-surface-border pb-3">
                    <h3 className="font-bold text-ink text-sm">Record Inspector</h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-xs text-ink-light hover:text-green font-semibold"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">Request Tracking UUID</p>
                      <p className="font-mono text-ink-secondary font-semibold bg-surface-soft p-2.5 rounded-lg border border-surface-border/50 truncate">
                        {selectedLog.request_id}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">Action Type</p>
                        <p className="font-bold capitalize">{selectedLog.action}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">Status</p>
                        <p className={cn("font-bold", selectedLog.success ? "text-green" : "text-red-600")}>
                          {selectedLog.success ? "Success" : "Failed"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">Target NIN</p>
                        <p className="font-mono font-bold text-ink-secondary">{selectedLog.nin}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">Client IP Address</p>
                        <p className="font-mono text-ink-secondary">{selectedLog.ip_address || "—"}</p>
                      </div>
                    </div>

                    {selectedLog.action === "verify" && selectedLog.success && (
                      <div className="bg-surface-soft border border-surface-border rounded-xl p-3.5 space-y-2">
                        <p className="text-[9px] font-bold text-ink-muted uppercase mb-1">ML Biometric Match details</p>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Oracle Match Decision</span>
                          <span className={cn("font-bold", selectedLog.decision === "MATCH" ? "text-green" : "text-red-600")}>
                            {selectedLog.decision}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-muted">Embedding Distance</span>
                          <span className="font-mono font-bold text-ink">{selectedLog.distance}</span>
                        </div>
                      </div>
                    )}

                    {!selectedLog.success && selectedLog.error_detail && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3.5">
                        <p className="text-[9px] font-bold text-red-700 uppercase mb-1">Error Details</p>
                        <p className="font-mono text-[11px] text-red-600 leading-normal">{selectedLog.error_detail}</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-surface-border/50 text-[10px] text-ink-muted flex items-start gap-2">
                      <Info className="h-4 w-4 text-green shrink-0 mt-0.5" />
                      <p className="leading-normal">
                        This audit record is encrypted and mirrored on-chain. Modification of the log will trigger registry hash integrity alerts.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="hidden lg:block border border-dashed border-surface-border rounded-2xl p-12 text-center bg-white">
                  <ArrowDownRight className="h-8 w-8 text-ink-light mx-auto mb-3" />
                  <p className="text-xs text-ink-secondary font-medium">Select an audit row to view the tracking payloads and cryptographic outputs.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
