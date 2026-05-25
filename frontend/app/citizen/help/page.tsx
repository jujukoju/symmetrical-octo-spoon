"use client";

import { motion } from "framer-motion";
import { Shield, Key, Eye, HelpCircle, FileText, UserCheck, MessageSquare, AlertCircle, ChevronRight } from "lucide-react";
import { RoleGuard } from "@/components/shared/RoleGuard";

const faqs = [
  {
    q: "Is my raw fingerprint biometric stored on the blockchain?",
    a: "No. Your raw fingerprint image is never stored off your device or broadcast on the public blockchain. Instead, the NIMC Oracle extracts a 128-D neural network embedding (feature vector), encrypts it using AES-256-GCM, and only registers a cryptographic hash of your NIN on-chain for verifications. Your biometrics remain private and unexposed.",
    icon: Shield
  },
  {
    q: "What is the purpose of the Ethereum wallet address?",
    a: "The Ethereum address establishes your decentralized identifier (DID). It maps your verified biometric hash to a wallet you control, enabling you to manage verifiers, approve authentication requests, and revoke access on-chain.",
    icon: Key
  },
  {
    q: "How do institutions verify my identity?",
    a: "When you present your NIN to an authorized verifier (e.g. a bank teller or border control agent), they scan your live fingerprint. The verification endpoint fetches your encrypted template, computes the cosine similarity between the live scan and stored embedding, and returns a boolean MATCH/NO MATCH result. Your full details are only disclosed based on your access level configuration.",
    icon: UserCheck
  },
  {
    q: "What regulations does this system follow?",
    a: "This platform is fully compliant with the Nigeria Data Protection Regulation (NDPR) and federal NIMC guidelines. Biometric encryption, on-chain consent management, and strict role-based access controls ensure that unauthorized data processing is prevented.",
    icon: FileText
  }
];

export default function CitizenHelpPage() {
  return (
    <RoleGuard allowedRoles={["citizen"]}>
      <div className="min-h-screen bg-surface-soft py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">Help &amp; Support</p>
            <h1 className="text-3xl font-bold text-ink">NINAuth Knowledge Center</h1>
            <p className="text-ink-secondary text-sm mt-2">
              Understand the security, technology, and privacy standards of the decentralized identity platform.
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* FAQs Grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="space-y-4">
              <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-green" /> Frequently Asked Questions
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="bg-white border border-surface-border rounded-2xl p-5 shadow-sm hover:border-green/20 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green/5 text-green shrink-0">
                        <faq.icon className="h-4.5 w-4.5" />
                      </div>
                      <h4 className="text-sm font-bold text-ink">{faq.q}</h4>
                    </div>
                    <p className="text-xs text-ink-secondary leading-relaxed pl-11">{faq.a}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Architecture Summary */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white border border-surface-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green/10 text-green shrink-0">
                <Eye className="h-7 w-7" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-sm font-bold text-ink mb-1">Interactive System Architecture</h3>
                <p className="text-xs text-ink-secondary leading-relaxed mb-3">
                  Inspect the system layout, oracle integrations, smart contracts and biometric preprocessor pipelines.
                </p>
                <a
                  href="/architecture"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-green hover:text-green-dark transition-colors"
                >
                  View Architecture Graph <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>

            {/* Support Notice */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-green/5 border border-green/15 rounded-2xl p-6 shadow-sm flex gap-4 items-start">
              <MessageSquare className="h-5 w-5 text-green shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-green-dark mb-1">Need NIMC Helpdesk Support?</h3>
                <p className="text-xs text-green leading-relaxed">
                  If you encounter errors regarding invalid NIN credentials, biometrics quality warnings, or blockchain transaction failures, please contact the NIMC support center or email <strong className="font-semibold">support@nimc.gov.ng</strong>. Include your tracking ID for speedier resolution.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
