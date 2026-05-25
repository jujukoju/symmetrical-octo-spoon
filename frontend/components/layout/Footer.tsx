"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, ExternalLink, Globe, Share2 } from "lucide-react";
import { api } from "@/lib/api";

const footerLinks = {
  "User Module": [
    { label: "Register Identity", href: "/register-identity" },
    { label: "Verification Portal", href: "/verifications" },
    { label: "Architecture", href: "/architecture" },
  ],
  "User Account": [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Identity", href: "/identity" },
    { label: "Institutions", href: "/institutions" },
    { label: "Governance", href: "/governance" },
  ],
  Legal: [
    { label: "About NIMC", href: "https://nimc.gov.ng/about-nimc" },
    { label: "Policies", href: "https://nimc.gov.ng/policies" },
    { label: "Data Protection Regulation", href: "https://nitda.gov.ng/wp-content/uploads/2021/01/NDPR-Implementation-Framework.pdf" },
    { label: "NDPR Compliance", href: "https://nitda.gov.ng/ndpr/" },
  ],
};

export function Footer() {
  const [isLive, setIsLive] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const res = await api.checkHealth();
      setIsLive(res.success && res.data?.status === "ok");
      setChecking(false);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    /* Dark green footer band — matches NIMC header */
    <footer className="border-t border-nimc-border bg-nimc">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">NINAuth</span>
            </div>
            <p className="text-sm text-nimc-text leading-relaxed max-w-xs">
              Nigeria&apos;s premier blockchain-based decentralized identity verification platform.
              Empowering citizens with sovereign control over their digital identities.
            </p>

            {/* System health */}
            <div className="mt-6 flex items-center gap-2">
              <div className={`flex h-2 w-2 rounded-full ${checking ? "bg-white/30" : isLive ? "bg-green-lighter animate-pulse" : "bg-red-400"}`} />
              <span className="text-xs text-nimc-text">
                {checking ? "Checking middleware layer…" : isLive ? "All systems operational" : "System disconnected"}
              </span>
            </div>

            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              {[Globe, Share2].map((Icon, i) => (
                <a key={i} href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-nimc-border text-nimc-text hover:text-white hover:border-white/30 transition-all">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-green-lighter mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href}
                      className="text-sm text-nimc-text hover:text-white transition-colors flex items-center gap-1 group">
                      {label}
                      {href === "#" && (
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-nimc-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-nimc-text/70">
            © {new Date().getFullYear()} NINAuth. Built on Nigerian infrastructure.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-lighter" />
              <span className="text-xs text-nimc-text/70">NDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-xs text-nimc-text/70">NIMC Partnered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span className="text-xs text-nimc-text/70">Blockchain Secured</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
