"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, ShieldAlert, Cpu, Database,
  TrendingUp, Clock, Globe, HelpCircle, Server, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { cn } from "@/lib/utils";

// Simulated historical response times (latencies)
const latencyHistory = [
  { time: "09:00", oracle: 41, ml: 420, blockchain: 12.1 },
  { time: "10:00", oracle: 45, ml: 490, blockchain: 12.4 },
  { time: "11:00", oracle: 85, ml: 1200, blockchain: 14.8 }, // slight load
  { time: "12:00", oracle: 120, ml: 1800, blockchain: 19.5 }, // load spike
  { time: "13:00", oracle: 48, ml: 800, blockchain: 13.0 },
  { time: "14:00", oracle: 42, ml: 410, blockchain: 12.0 },
  { time: "15:00", oracle: 39, ml: 380, blockchain: 12.2 },
];

// Predictive congestion load
const congestionForecast = [
  { hour: "16:00", predictedLoad: 35, status: "low" },
  { hour: "17:00", predictedLoad: 42, status: "low" },
  { hour: "18:00", predictedLoad: 78, status: "high" }, // peak hours prediction
  { hour: "19:00", predictedLoad: 92, status: "critical" }, // congestion threat
  { hour: "20:00", predictedLoad: 60, status: "medium" },
  { hour: "21:00", predictedLoad: 30, status: "low" },
];

export default function AnomalyRadarPage() {
  const [activeAlerts, setActiveAlerts] = useState([
    {
      id: "alt-001",
      title: "Biometric Inference Thread Pools Degradation",
      desc: "ML inference latency spiked to 1.8s. Thread pool queue exceeds limit (15 jobs). Potential request backpressure detected.",
      severity: "medium",
      time: "2 mins ago"
    },
    {
      id: "alt-002",
      title: "Verifier High-Frequency Verification Outlier",
      desc: "NIN ****-****-112 queried 142 times in 24 hours. Rate limit thresholds exceeded. Verification request flagged for review.",
      severity: "high",
      time: "10 mins ago"
    }
  ]);

  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const handleResolveAlert = (id: string) => {
    setActiveAlerts(activeAlerts.filter((a) => a.id !== id));
  };

  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleTimeString());
  };

  return (
    <RoleGuard allowedRoles={["government"]}>
      <div className="min-h-screen bg-surface-soft py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">NIMC Official Gov Portal</p>
              <h1 className="text-3xl font-bold text-ink">Network Health &amp; Anomaly Radar</h1>
              <p className="text-ink-secondary text-sm mt-1">
                Real-time anomaly monitoring, machine learning inference queue sizing, and network health forecasts.
              </p>
            </motion.div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-xs font-bold text-ink-secondary hover:text-green hover:border-green/30 transition-all shadow-sm shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Updated {lastUpdated}
            </button>
          </div>

          {/* Active Threats / Alerts */}
          {activeAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2 text-red-700">
                <ShieldAlert className="h-5.5 w-5.5" />
                <h3 className="font-bold text-red-900">Active System Anomalies ({activeAlerts.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="bg-white border border-red-200/50 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          alert.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {alert.severity} Priority
                        </span>
                        <span className="text-[10px] text-ink-light font-medium">{alert.time}</span>
                      </div>
                      <h4 className="text-xs font-bold text-ink mb-1">{alert.title}</h4>
                      <p className="text-[11px] text-ink-secondary leading-relaxed">{alert.desc}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="text-[10px] font-bold text-green hover:text-green-dark bg-green/5 hover:bg-green/10 border border-green/20 px-3 py-1 rounded-lg transition-colors"
                      >
                        Acknowledge &amp; Mitigate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Core Latency Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 rounded-2xl border border-surface-border bg-white p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-ink flex items-center gap-2">
                    <Activity className="h-4.5 w-4.5 text-green" /> ML Biometric Inference Latency Trend
                  </h3>
                  <p className="text-xs text-ink-muted">Historical extraction pipeline response times (ms)</p>
                </div>
                <Cpu className="h-5 w-5 text-green" />
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={latencyHistory}>
                    <defs>
                      <linearGradient id="mlLatencyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#006B3F" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#006B3F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EBF0EB" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: "#6B7F6E", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#6B7F6E", fontSize: 11 }} label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#6b7f6e', fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="ml" name="Inference Speed" stroke="#006B3F" strokeWidth={2} fill="url(#mlLatencyGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Predictive Congestion Panel */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold text-ink flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4.5 w-4.5 text-green" /> Capacity &amp; Congestion Forecast
                </h3>
                <p className="text-xs text-ink-muted mb-4">ML request volumes prediction (next 6h)</p>

                <div className="space-y-3.5">
                  {congestionForecast.map((fc) => (
                    <div key={fc.hour} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-secondary font-mono">{fc.hour}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-2 w-full bg-surface-soft border border-surface-border rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              fc.status === "critical" ? "bg-red-500" :
                              fc.status === "high" ? "bg-amber-500" : "bg-green"
                            )}
                            style={{ width: `${fc.predictedLoad}%` }}
                          />
                        </div>
                      </div>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded border min-w-[70px] text-center",
                        fc.status === "critical" ? "bg-red-50 text-red-600 border-red-100" :
                        fc.status === "high" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-green/10 text-green border-green/20"
                      )}>
                        {fc.predictedLoad}% {fc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-border bg-surface-soft/40 p-3 rounded-xl flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-ink-secondary leading-normal">
                  <strong>Prediction:</strong> Concurrency load is projected to reach critical peaks at <strong className="text-red-600">19:00</strong>. Scaling pool to 4 worker threads recommended.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Downtime Prediction and System Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card"
            >
              <h3 className="font-bold text-ink flex items-center gap-2 mb-4">
                <Server className="h-4.5 w-4.5 text-green" /> Infrastructure Health Sizing
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-surface-border/50 pb-3">
                  <div>
                    <p className="font-bold text-ink">FastAPI Oracle Database Connections</p>
                    <p className="text-[10px] text-ink-muted">Active / Peak Pools</p>
                  </div>
                  <span className="font-bold text-ink">18 / 100 Connections</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-border/50 pb-3">
                  <div>
                    <p className="font-bold text-ink">Inference Engine Memory Sizing</p>
                    <p className="text-[10px] text-ink-muted">Siamese SNN parameter footprint</p>
                  </div>
                  <span className="font-bold text-ink">1.42 GB / 4.00 GB</span>
                </div>
                <div className="flex justify-between items-center border-b border-surface-border/50 pb-3">
                  <div>
                    <p className="font-bold text-ink">Sepolia Blockchain Gateway RPC</p>
                    <p className="text-[10px] text-ink-muted">HTTP provider availability</p>
                  </div>
                  <span className="text-green font-bold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green" /> Connected (100% SLA)
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-surface-border bg-white p-6 shadow-card"
            >
              <h3 className="font-bold text-ink flex items-center gap-2 mb-4">
                <Clock className="h-4.5 w-4.5 text-green" /> Downtime Risk Assessor
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-green/5 border border-green/15 rounded-xl flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green/10 text-green shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-green-dark">Estimated Downtime Probability</h4>
                    <p className="text-sm font-black text-green mt-0.5">0.42% (Extremely Low)</p>
                    <p className="text-[10px] text-ink-secondary mt-1">Based on thread capacity, database indexing speeds, and network block delays.</p>
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-800">Congestion Warning Sizing</h4>
                    <p className="text-sm font-black text-amber-700 mt-0.5">Medium (ML Preprocessing Congestion)</p>
                    <p className="text-[10px] text-ink-secondary mt-1">Inference spikes can delay fingerprint verification. Thread pooling maintains integrity.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </RoleGuard>
  );
}
