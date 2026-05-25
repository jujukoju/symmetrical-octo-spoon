"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, Search, Shield, Globe,
  TrendingUp, ExternalLink, Ban, XCircle,
} from "lucide-react";
import { institutions } from "@/lib/mockData";
import { Institution } from "@/lib/types";

const typeColors: Record<string, string> = {
  bank:       "bg-blue-50 text-blue-700 border-blue-200",
  hospital:   "bg-red-50 text-red-700 border-red-200",
  government: "bg-violet-50 text-violet-700 border-violet-200",
  education:  "bg-amber-50 text-amber-700 border-amber-200",
  telecom:    "bg-cyan-50 text-cyan-700 border-cyan-200",
};

function InstitutionCard({ inst }: { inst: Institution }) {
  const [suspended, setSuspended] = useState(false);
  const typeClass = typeColors[inst.type] || "bg-surface-muted text-ink-muted border-surface-border";

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border bg-white p-5 shadow-card transition-all ${suspended ? "opacity-50 border-red-200" : "border-surface-border hover:border-green/25"}`}>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-surface-soft text-2xl">
            {inst.logo}
          </div>
          <div>
            <p className="font-bold text-ink text-sm">{inst.name}</p>
            <p className="text-xs text-ink-muted">{inst.shortName} · {inst.location}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase capitalize ${typeClass}`}>
          {inst.type}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="rounded-lg bg-surface-soft border border-surface-border p-2">
          <p className="text-sm font-black text-ink">{inst.totalVerifications.toLocaleString()}</p>
          <p className="text-[10px] text-ink-muted">Verifications</p>
        </div>
        <div className="rounded-lg bg-surface-soft border border-surface-border p-2">
          <p className="text-sm font-black text-ink">{inst.trustScore}%</p>
          <p className="text-[10px] text-ink-muted">Trust Score</p>
        </div>
        <div className="rounded-lg bg-surface-soft border border-surface-border p-2">
          <p className="text-sm font-black text-ink">L{inst.accessLevel}</p>
          <p className="text-[10px] text-ink-muted">Access Level</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {inst.isVerified
            ? <><CheckCircle2 className="h-3.5 w-3.5 text-green" /><span className="text-[10px] text-green font-semibold">Licensed & Verified</span></>
            : <><XCircle className="h-3.5 w-3.5 text-amber-500" /><span className="text-[10px] text-amber-600 font-semibold">Pending Review</span></>
          }
        </div>
        <div className="flex gap-1.5">
          {inst.website && (
            <a href={inst.website} target="_blank" rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border bg-surface-soft hover:bg-surface-muted transition-colors">
              <ExternalLink className="h-3.5 w-3.5 text-ink-muted" />
            </a>
          )}
          <button onClick={() => setSuspended(!suspended)}
            className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-colors ${
              suspended
                ? "border-green/20 bg-green/10 text-green hover:bg-green/20"
                : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            }`}>
            {suspended ? <><CheckCircle2 className="h-3 w-3" /> Reinstate</> : <><Ban className="h-3 w-3" /> Suspend</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function GovInstitutionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const types = ["all", ...Array.from(new Set(institutions.map((i) => i.type)))];

  const filtered = institutions.filter((inst) => {
    const matchSearch = inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.shortName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || inst.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="min-h-screen bg-surface-soft py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Government Portal</p>
          <h1 className="text-3xl font-bold text-ink">Manage Institutions</h1>
          <p className="text-ink-secondary text-sm mt-1">
            {institutions.length} registered institutions with active NINAuth integration licences.
          </p>
        </motion.div>

        {/* Summary Stat */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Institutions", value: institutions.length, icon: Building2, color: "text-blue-700" },
            { label: "Verified & Licensed", value: institutions.filter((i) => i.isVerified).length, icon: CheckCircle2, color: "text-green" },
            { label: "Avg. Trust Score", value: `${Math.round(institutions.reduce((s, i) => s + i.trustScore, 0) / institutions.length)}%`, icon: Shield, color: "text-violet-700" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-surface-border bg-white p-4 shadow-card flex items-center gap-3">
              <Icon className={`h-6 w-6 ${color}`} />
              <div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-ink-secondary">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <input type="text" placeholder="Search institutions…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-surface-border pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-green/20 outline-none transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {types.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all capitalize ${
                  typeFilter === t ? "bg-green text-white shadow-green-sm" : "bg-white border border-surface-border text-ink-secondary hover:border-green/40"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inst) => <InstitutionCard key={inst.id} inst={inst} />)}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-surface-border bg-white p-12 text-center">
            <Globe className="h-10 w-10 text-ink-muted mx-auto mb-3" />
            <p className="text-ink-secondary text-sm">No institutions match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
