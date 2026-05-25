"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain, Link2, Blocks, Fingerprint, Shield, User,
  ArrowRight, ChevronDown, CheckCircle2, Lock, Globe, ArrowDown,
} from "lucide-react";
import { DocumentCard } from "@/components/shared/DocumentCard";
import { MiddlewarePipeline } from "@/components/shared/MiddlewarePipeline";

const fadeUp = (i = 0) => ({
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.45, ease: "easeOut" as const } },
});

const frontendModules = [
  {
    id: "user-module",
    title: "User Module",
    subtitle: "Entry point for citizen interaction",
    icon: Fingerprint,
    color: "text-green",
    bg: "bg-green/5",
    border: "border-green/25",
    features: ["Register Identity — Submit NIN + fingerprint", "Verification Portal — Live identity checks", "NIN format validation before submission"],
    href: "/register-identity",
  },
  {
    id: "user-account",
    title: "User Account Section",
    subtitle: "Authenticated user dashboard",
    icon: User,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    features: ["Activity Dashboard — Analytics & history", "My Identity — Profile & verification status", "Institution Access — Manage permissions"],
    href: "/dashboard",
  },
];

const middlewareModules = [
  {
    id: "dl-engine",
    title: "Deep Learning Engine",
    subtitle: "Biometric encryption layer",
    icon: Brain,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    tag: "Privacy Layer",
    details: ["Receives raw fingerprint image from frontend", "Neural network produces encrypted biometric hash", "Raw image is never stored or transmitted", "Only encrypted hash reaches the blockchain"],
  },
  {
    id: "nin-oracle",
    title: "NIN Validation Oracle",
    subtitle: "Trusted NIMC directory intermediary",
    icon: Link2,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    tag: "Trusted Middleman",
    details: ["Receives NIN from the frontend layer", "Queries simulated NIMC citizen directory", "Returns Boolean confirmation to smart contract", "No raw PII is ever sent to blockchain"],
  },
  {
    id: "blockchain",
    title: "Blockchain Module",
    subtitle: "Immutable identity ledger",
    icon: Blocks,
    color: "text-green",
    bg: "bg-green/5",
    border: "border-green/20",
    tag: "Smart Contract",
    details: ["Receives Boolean from NIN Oracle", "Receives encrypted biometric hash from DL Engine", "Smart contract anchors identity record on-chain", "Every verification event is permanently logged"],
  },
];

const dataFlow = [
  { step: "1", from: "User (Frontend)", action: "Submits NIN + fingerprint scan via User Module", to: "Middleware Layer", color: "text-green", border: "border-green/20", bg: "bg-green/4" },
  { step: "2", from: "Deep Learning Engine", action: "Encrypts raw fingerprint image → produces biometric hash", to: "Blockchain Module", color: "text-violet-700", border: "border-violet-200", bg: "bg-violet-50/50" },
  { step: "3", from: "NIN Validation Oracle", action: "Validates NIN against NIMC directory → returns Boolean", to: "Smart Contract", color: "text-blue-700", border: "border-blue-200", bg: "bg-blue-50/50" },
  { step: "4", from: "Blockchain Module", action: "Smart contract anchors verified identity hash on-chain", to: "Permanent Record", color: "text-green", border: "border-green/20", bg: "bg-green/4" },
];

export default function ArchitecturePage() {
  const [activePipeline, setActivePipeline] = useState(0);

  useEffect(() => {
    let stage = 1;
    const id = setInterval(() => {
      setActivePipeline(stage);
      stage = stage >= 3 ? 0 : stage + 1;
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-surface-soft py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div variants={fadeUp(0)} initial="hidden" animate="show" className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/8 px-4 py-1.5 mb-6">
            <Globe className="h-3.5 w-3.5 text-green" />
            <span className="text-xs font-semibold text-green tracking-wider uppercase">System Architecture</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-4">
            NINAuth <span className="text-green-gradient">Architecture</span>
          </h1>
          <p className="text-ink-secondary max-w-2xl mx-auto leading-relaxed">
            A three-layer, privacy-first design. The frontend collects biometric input — but raw data
            never leaves without first being encrypted by the Deep Learning Engine middleware.
          </p>
        </motion.div>

        {/* Middleware live status removed */}

        {/* Layer 1: Frontend */}
        <motion.div variants={fadeUp(2)} initial="hidden" animate="show" className="mb-4">
          <div className="flex items-center gap-3 mb-5">
            <span className="layer-badge bg-green/10 text-green border border-green/25">Layer 1</span>
            <h2 className="text-lg font-bold text-ink">Frontend Layer — User Interface</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {frontendModules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div key={mod.id}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl border ${mod.border} ${mod.bg} p-6 group hover:shadow-green-sm transition-all duration-300 shadow-card`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white ${mod.color} shadow-card`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-ink">{mod.title}</h3>
                        <p className="text-xs text-ink-muted">{mod.subtitle}</p>
                      </div>
                    </div>
                    <Link href={mod.href}
                      className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold ${mod.color} transition-opacity`}>
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-ink-secondary">
                        <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${mod.color}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Connector */}
        <div className="flex justify-center my-6">
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Encrypted API Flow</p>
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="h-2 w-2 rounded-full bg-green/40"
                animate={{ opacity: [0.2, 1, 0.2], y: [0, 4, 0] }}
                transition={{ duration: 1.2, delay: i * 0.25, repeat: Infinity }} />
            ))}
            <ArrowDown className="h-5 w-5 text-green/50" />
          </div>
        </div>

        {/* Layer 2: Middleware */}
        <motion.div variants={fadeUp(3)} initial="hidden" animate="show" className="mb-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="layer-badge bg-violet-100 text-violet-700 border border-violet-200">Layer 2</span>
            <h2 className="text-lg font-bold text-ink">Middleware / Application Layer</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {middlewareModules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div key={mod.id}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                  className={`rounded-2xl border ${mod.border} ${mod.bg} p-6 relative shadow-card`}>
                  <div className="absolute top-3 right-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted border border-surface-border bg-white rounded px-1.5 py-0.5">
                      {mod.tag}
                    </span>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white ${mod.color} mb-4 shadow-card`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-ink mb-0.5">{mod.title}</h3>
                  <p className="text-xs text-ink-muted mb-4">{mod.subtitle}</p>
                  <ul className="space-y-2">
                    {mod.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-xs text-ink-secondary">
                        <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${mod.color.replace("text-", "bg-")}`} />
                        {d}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
          <MiddlewarePipeline activeStage={activePipeline} />
        </motion.div>

        {/* Data Flow */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="mb-10 mt-8">
          <h2 className="text-lg font-bold text-ink mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-green" /> End-to-End Data Flow
          </h2>
          <div className="space-y-3">
            {dataFlow.map(({ step, from, action, to, color, border, bg }, i) => (
              <motion.div key={step}
                initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-xl border ${border} ${bg} p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-card`}>
                <span className={`text-2xl font-black ${color} opacity-30 w-8 shrink-0`}>{step}</span>
                <div className="flex-1">
                  <span className={`text-xs font-bold ${color}`}>{from}</span>
                  <p className="text-sm text-ink mt-0.5">{action}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ArrowRight className={`hidden sm:block h-4 w-4 ${color}`} />
                  <span className={`text-xs font-semibold ${color} bg-white rounded-lg px-3 py-1.5 border ${border}`}>{to}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-green/20 bg-green/5 p-8 text-center shadow-card">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green/12 ring-2 ring-green/20 mb-4">
            <Fingerprint className="h-7 w-7 text-green" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Ready to use the system?</h2>
          <p className="text-ink-secondary text-sm mb-6">Enter through the User Module to register your fingerprint identity.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/register-identity"
              className="flex items-center gap-2 rounded-xl bg-green px-6 py-3 font-bold text-white hover:bg-green-light transition-all shadow-green-sm">
              <Fingerprint className="h-4 w-4" /> Register Identity
            </Link>
            <Link href="/verifications"
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-6 py-3 font-semibold text-ink hover:border-green/35 transition-all shadow-card">
              Verification Portal <ArrowRight className="h-4 w-4 text-ink-muted" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
