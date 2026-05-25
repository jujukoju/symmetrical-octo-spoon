"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Menu, X, Bell, ChevronDown, CheckCircle2,
  User, LayoutDashboard, FileCheck, Building2, Vote,
  Fingerprint, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const roleLinks = {
  citizen: [
    { href: "/citizen/dashboard", label: "Home", icon: LayoutDashboard, desc: "Activity overview" },
    { href: "/register-identity", label: "Enroll Identity", icon: Fingerprint, desc: "Register your biometrics" },
    { href: "/citizen/status", label: "Check Status", icon: FileCheck, desc: "Verify blockchain status" },
    { href: "/citizen/help", label: "Help/Support", icon: User, desc: "FAQs & help desk info" },
  ],
  institution: [
    { href: "/institution/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Verification statistics" },
    { href: "/institution/verify", label: "Verify Citizen", icon: Shield, desc: "Conduct identity checks" },
    { href: "/institution/audit", label: "Recent Scans", icon: FileCheck, desc: "View past verifications" },
  ],
  government: [
    { href: "/gov/dashboard", label: "Admin Overview", icon: LayoutDashboard, desc: "Real-time analytics" },
    { href: "/gov/radar", label: "Network Health (Anomaly Radar)", icon: Shield, desc: "Monitor threat levels & latencies" },
    { href: "/gov/audit", label: "Audit Logs", icon: FileCheck, desc: "View system audit trails" },
    { href: "/gov/institutions", label: "Manage Verifiers", icon: Building2, desc: "Manage registered bodies" },
  ],
};

const notifications = [
  { id: 1, text: "First Bank requests KYC verification", time: "2m ago", unread: true },
  { id: 2, text: "Access Bank loan verification pending", time: "1h ago", unread: true },
  { id: 3, text: "LUTH access approved successfully", time: "1d ago", unread: false },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;
  // Ensure we have a safe fallback if role is undefined
  const currentLinks = roleLinks[role as keyof typeof roleLinks] || roleLinks.citizen;

  const closeAll = () => { setMobileOpen(false); setNotifOpen(false); setProfileOpen(false); };

  return (
    <header className="sticky top-0 z-50 border-b border-nimc-border bg-nimc shadow-green-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" onClick={closeAll}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 group-hover:ring-white/40 transition-all duration-300">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">NINAuth</span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {currentLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === link.href ? "text-white bg-white/15" : "text-nimc-text hover:text-white hover:bg-white/10"
                )}
              >
                {link.label}
              </Link>
            ))}
            {role !== "government" && (
              <Link
                href="/architecture"
                className={cn(
                  "px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname === "/architecture" ? "text-white bg-white/15" : "text-nimc-text hover:text-white hover:bg-white/10"
                )}
              >
                Architecture
              </Link>
            )}
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-nimc-text hover:text-white hover:bg-white/10 transition-all"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-lighter opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-lighter" />
                  </span>
                )}
              </button>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-green text-xs font-bold">
                  {user?.firstName ? user.firstName[0] : "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-white leading-none">{user?.firstName || "User"}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-300">Verified</span>
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-white/50" />
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-12 w-60 rounded-xl border border-surface-border bg-white shadow-green-lg p-2 z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-surface-border mb-2">
                      <p className="text-sm font-semibold text-ink">{user?.fullName || "System User"}</p>
                      <p className="text-xs font-mono text-green uppercase">{role}</p>
                    </div>
                    <Link href={`/${role}/identity`} onClick={closeAll}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-green hover:bg-surface-soft transition-all">
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                    <Link href={`/${role}/dashboard`} onClick={closeAll}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-green hover:bg-surface-soft transition-all">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <div className="border-t border-surface-border mt-2 pt-2">
                      <Link href="/login" onClick={() => { signOut(); closeAll(); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-all">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-nimc-text hover:text-white hover:bg-white/10"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-nimc-border bg-nimc-mid overflow-hidden"
          >
            <nav className="flex flex-col p-4 gap-1">
              {currentLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeAll}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    pathname === link.href ? "bg-white/15 text-white" : "text-nimc-text hover:text-white hover:bg-white/10"
                  )}>
                  <link.icon className="h-4 w-4" />{link.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}