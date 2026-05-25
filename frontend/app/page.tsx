"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight, Shield, Fingerprint, FileCheck,
  Building2, Lock, Zap, Globe, CheckCircle2, ChevronRight,
} from "lucide-react";
import { platformStats, institutions } from "@/lib/mockData";
import { formatNumber } from "@/lib/utils";

const fadeUp = (i = 0) => ({
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } },
});

const steps = [
  { n: "01", title: "Register Identity", desc: "Submit your NIN and biometrics. The system verifies authenticity end-to-end.", icon: Fingerprint },
  { n: "02", title: "Blockchain Anchoring", desc: "Your identity hash is cryptographically secured on-chain — immutable and auditable.", icon: Shield },
  { n: "03", title: "Grant Access Securely", desc: "Approve or reject institution requests. You control exactly what data is shared.", icon: Lock },
];

const features = [
  { icon: Fingerprint, title: "Biometric Verification", desc: "Fingerprint authentication with neural-network accuracy — encrypted before transmission.", primary: true },
  { icon: FileCheck, title: "Document Vault", desc: "Encrypted, IPFS-backed storage for all identity documents with on-chain integrity proofs." },
  { icon: Shield, title: "Permission-Based Sharing", desc: "Granular control over which attributes each institution can access and for how long." },
  { icon: Building2, title: "Multi-Institution Access", desc: "One identity, verified across banks, hospitals, government agencies and more." },
  { icon: Zap, title: "Fraud Detection Layer", desc: "AI monitors access patterns and flags anomalies. Risk score updates in real time." },
  { icon: Globe, title: "Blockchain Auditability", desc: "Every access event is recorded on-chain — a full history you can independently verify." },
];

const userTypes = [
  { emoji: "👤", tag: "Citizens", heading: "Take back control", body: "Own your digital identity. Approve who sees your data. Get verified once, share everywhere.", href: "/register-identity", cta: "Register Identity" },
  { emoji: "🏢", tag: "Institutions", heading: "Verify with confidence", body: "Streamline KYC and onboarding with cryptographic identity proofs from NIMC-backed records.", href: "/institutions", cta: "Join as Institution" },
  { emoji: "🏛️", tag: "Government", heading: "Govern with transparency", body: "Monitor access patterns, enforce policy, and maintain sovereign infrastructure for citizen data.", href: "/governance", cta: "Learn More" },
];

export default function LandingPage() {
  return (
    <div className="bg-surface-soft overflow-x-hidden">

      {/* ── Hero — white section with dark-green NIMC accent ── */}
      <section className="relative bg-grid bg-surface-soft min-h-[88vh] flex items-center">
        {/* Radial glow — very subtle on light bg */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-green/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div variants={fadeUp(0)} initial="hidden" animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/8 px-4 py-1.5 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-semibold text-green tracking-wider uppercase">NIMC-Partnered Identity Infrastructure</span>
          </motion.div>

          <motion.h1 variants={fadeUp(1)} initial="hidden" animate="show"
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink mb-6 leading-[1.08]">
            Your Identity.{" "}
            <span className="text-green-gradient">Verified.</span>
            <br className="hidden sm:block" />Secured. Decentralized.
          </motion.h1>

          <motion.p variants={fadeUp(2)} initial="hidden" animate="show"
            className="mx-auto max-w-2xl text-lg text-ink-secondary leading-relaxed mb-10">
            NINAuth transforms Nigeria&apos;s National Identification Number into a sovereign,
            privacy-preserving digital identity, secured by biometrics and blockchain technology.
            One identity, trusted everywhere.
          </motion.p>

          <motion.div variants={fadeUp(3)} initial="hidden" animate="show"
            className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link href="/register-identity"
              className="group flex items-center gap-2 rounded-xl bg-green px-7 py-3.5 font-semibold text-white hover:bg-green-light transition-all shadow-green-md">
              <Fingerprint className="h-4 w-4" />
              Register Identity <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-surface-border bg-white px-7 py-3.5 font-semibold text-ink hover:border-green/40 hover:text-green transition-all shadow-card">
              View Dashboard <ChevronRight className="h-4 w-4 text-ink-muted" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp(4)} initial="hidden" animate="show"
            className="flex flex-wrap items-center justify-center gap-6 text-xs text-ink-muted">
            {["NDPR Compliant", "NIMC Partnered", "Privacy-Preserving", "Citizen-Centric"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green" />{t}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Stats Bar — dark green band (NIMC header style) ── */}
      <section className="border-y border-nimc-border bg-nimc">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { label: "Identities Registered", value: platformStats.totalIdentities },
              { label: "Verifications Completed", value: platformStats.totalVerifications },
              { label: "Active Institutions", value: platformStats.activeInstitutions },
              { label: "Countries Supported", value: platformStats.countriesSupported },
            ].map(({ label, value }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(value)}+</p>
                <p className="text-sm text-nimc-text">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works — white cards on light bg ── */}
      <section className="py-24 bg-surface-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-3">Simple &amp; Secure</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">How NINAuth Works</h2>
            <p className="mt-3 text-ink-secondary max-w-xl mx-auto text-sm">Three steps to sovereign digital identity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ n, title, desc, icon: Icon }, i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }} whileHover={{ y: -4 }}
                className="relative rounded-2xl border border-surface-border bg-white p-8 hover:border-green/40 hover:shadow-green-sm group transition-all duration-300 shadow-card">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-5xl font-black text-green/10 group-hover:text-green/18 transition-colors">{n}</span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green/8 text-green ring-1 ring-green/15 group-hover:ring-green/30 transition-all">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-ink mb-2">{title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid — light muted background ── */}
      <section className="py-24 bg-surface-muted border-y border-surface-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-3">Platform Capabilities</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">Built for Security at Scale</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, primary }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                className={`rounded-2xl border p-6 transition-all duration-300 shadow-card ${primary
                  ? "border-green/30 bg-green/5"
                  : "border-surface-border bg-white hover:border-green/25"}`}>
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${primary ? "bg-green/12 text-green" : "bg-surface-soft text-ink-muted"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-ink mb-2">{title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── User Types ── */}
      <section className="py-24 bg-surface-soft">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-3">Who It&apos;s For</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink">One Platform, Every Stakeholder</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {userTypes.map(({ emoji, tag, heading, body, href, cta }, i) => (
              <motion.div key={tag} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="rounded-2xl border border-surface-border bg-white p-8 hover:border-green/35 hover:shadow-green-sm transition-all duration-300 flex flex-col shadow-card">
                <div className="text-4xl mb-4">{emoji}</div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">{tag}</p>
                <h3 className="text-xl font-bold text-ink mb-3">{heading}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed flex-1">{body}</p>
                <Link href={href}
                  className="mt-6 flex items-center gap-2 text-sm font-semibold text-green hover:text-green-dark transition-colors group">
                  {cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted Institutions ── */}
      <section className="py-14 border-t border-surface-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-muted mb-8">
            Trusted by leading Nigerian institutions
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {institutions.slice(0, 6).map((inst) => (
              <div key={inst.id}
                className="flex items-center gap-2.5 rounded-xl border border-surface-border bg-white px-5 py-3 hover:border-green/35 hover:shadow-green-sm transition-all shadow-card">
                <span className="text-xl">{inst.logo}</span>
                <span className="text-sm font-medium text-ink-secondary">{inst.shortName}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA — dark green band ── */}
      <section className="py-24 bg-nimc">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-2 ring-white/20 mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Ready to secure your identity?</h2>
            <p className="text-nimc-text mb-8 leading-relaxed">
              Join over 127 million Nigerians who&apos;ve taken control of their digital identity.
              Register in minutes, verified for life.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/register-identity"
                className="group flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-green hover:bg-green-lighter hover:text-white transition-all shadow-green-sm">
                <Fingerprint className="h-5 w-5" />
                Start Registration <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/institutions"
                className="flex items-center gap-2 rounded-xl border border-white/25 px-8 py-4 font-semibold text-white hover:bg-white/10 transition-all">
                <Building2 className="h-5 w-5" /> For Institutions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
