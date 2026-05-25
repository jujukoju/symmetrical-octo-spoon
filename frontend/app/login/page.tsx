"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, User, Building2, Vote, ChevronRight, Loader2, Fingerprint, Lock, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { SystemRole } from "@/lib/types";

function dashboardPath(role: SystemRole): string {
  if (role === "institution") return "/institution/dashboard";
  if (role === "government") return "/gov/dashboard";
  return "/citizen/dashboard";
}

export default function LoginPage() {
  const { switchRole } = useAuth();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Input states
  const [nin, setNin] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [verifierPassword, setVerifierPassword] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const roles = [
    { id: "citizen", label: "Citizen (End-User)", icon: User, desc: "Enroll biometrics and view on-chain identity." },
    { id: "institution", label: "Verifier (Bank / Border)", icon: Building2, desc: "Verify citizen biometrics against oracle." },
    { id: "government", label: "System Admin (NIMC)", icon: Vote, desc: "Monitor network health & audit logs." },
  ] as const;

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nin.length !== 11 || !/^\d{11}$/.test(nin)) {
      setError("NIN must be exactly 11 digits.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      // Simulate biometric validation
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Perform role switch and save to session
      await switchRole("citizen", nin);
      router.push(dashboardPath("citizen"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Biometric validation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseNumber || !verifierPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError("");

    // Validate demo credentials
    if (licenseNumber === "RC-11024-FBN" && verifierPassword === "verifier123") {
      try {
        await switchRole("institution");
        router.push(dashboardPath("institution"));
      } catch {
        setError("Failed to create verifier session.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setTimeout(() => {
        setError("Invalid verifier credentials. Check the demo tip below.");
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId || !adminPassword) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError("");

    // Validate demo credentials
    if (badgeId === "NIMC-ADM-001" && adminPassword === "admin123") {
      try {
        await switchRole("government");
        router.push(dashboardPath("government"));
      } catch {
        setError("Failed to create admin session.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setTimeout(() => {
        setError("Invalid admin credentials. Check the demo tip below.");
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl border border-surface-border p-8 shadow-card">

        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green/10 mb-3 border border-green/20">
            <Shield className="h-7 w-7 text-green" />
          </div>
          <h1 className="text-xl font-bold text-ink">NINAuth Registry Portal</h1>
          <p className="text-ink-secondary text-xs mt-1 text-center">
            Role-Based Access Control Identity Gateway
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {roles.map((role) => {
            const active = selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  setSelectedRole(role.id as SystemRole);
                  setError("");
                }}
                className={`w-full flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left ${active ? "border-green bg-green/5 ring-1 ring-green/30" : "border-surface-border hover:border-green/30 hover:bg-surface-soft"
                  }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${active ? "bg-green text-white" : "bg-white text-ink-light border border-surface-border"}`}>
                  <role.icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold leading-none ${active ? "text-green-dark" : "text-ink"}`}>{role.label}</p>
                  <p className="text-[10px] text-ink-secondary mt-1 truncate">{role.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Dynamic Forms per Role */}
        {selectedRole === "citizen" && (
          <form onSubmit={handleCitizenLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <label htmlFor="nin-input" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">National ID (NIN)</label>
              <input
                id="nin-input"
                type="text"
                placeholder="Enter 11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                maxLength={11}
                inputMode="numeric"
                className="w-full rounded-xl border border-surface-border p-3 text-sm focus:ring-1 focus:ring-green focus:border-green outline-none font-mono"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || nin.length !== 11}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green py-3 text-sm font-bold text-white hover:bg-green-light transition-all shadow-green-sm disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating...</>
              ) : (
                <><Fingerprint className="h-4 w-4" /> Sign In with Biometrics</>
              )}
            </button>

            <div className="bg-surface-soft border border-surface-border rounded-xl p-3 text-[10px] text-ink-secondary">
              <span className="font-bold text-green">Demo Tip:</span> Use <strong>12345678901</strong> to log in as Citizen Adebayo.
            </div>
          </form>
        )}

        {selectedRole === "institution" && (
          <form onSubmit={handleVerifierLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <label htmlFor="license-input" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Verifier License Number</label>
              <input
                id="license-input"
                type="text"
                placeholder="RC-XXXXX-XXX"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full rounded-xl border border-surface-border p-3 text-sm focus:ring-1 focus:ring-green focus:border-green outline-none font-mono"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="passcode-input" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Verifier Passcode</label>
              <div className="relative">
                <input
                  id="passcode-input"
                  type="password"
                  placeholder="••••••••"
                  value={verifierPassword}
                  onChange={(e) => setVerifierPassword(e.target.value)}
                  className="w-full rounded-xl border border-surface-border p-3 text-sm focus:ring-1 focus:ring-green focus:border-green outline-none"
                  required
                  disabled={isLoading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !licenseNumber || !verifierPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green py-3 text-sm font-bold text-white hover:bg-green-light transition-all shadow-green-sm disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying License...</>
              ) : (
                <>Sign In as Verifier <ChevronRight className="h-4 w-4" /></>
              )}
            </button>

            <div className="bg-surface-soft border border-surface-border rounded-xl p-3 text-[10px] text-ink-secondary">
              <span className="font-bold text-green">Demo Tip:</span> License: <strong>RC-11024-FBN</strong> | Passcode: <strong>verifier123</strong>
            </div>
          </form>
        )}

        {selectedRole === "government" && (
          <form onSubmit={handleAdminLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div>
              <label htmlFor="badge-input" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">NIMC Badge Number</label>
              <input
                id="badge-input"
                type="text"
                placeholder="NIMC-ADM-XXX"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                className="w-full rounded-xl border border-surface-border p-3 text-sm focus:ring-1 focus:ring-green focus:border-green outline-none font-mono"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="admin-pass-input" className="block text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">Admin Passcode</label>
              <div className="relative">
                <input
                  id="admin-pass-input"
                  type="password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full rounded-xl border border-surface-border p-3 text-sm focus:ring-1 focus:ring-green focus:border-green outline-none"
                  required
                  disabled={isLoading}
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-light" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !badgeId || !adminPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green py-3 text-sm font-bold text-white hover:bg-green-light transition-all shadow-green-sm disabled:opacity-50"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Elevating Session...</>
              ) : (
                <>Sign In as NIMC Officer <ChevronRight className="h-4 w-4" /></>
              )}
            </button>

            <div className="bg-surface-soft border border-surface-border rounded-xl p-3 text-[10px] text-ink-secondary">
              <span className="font-bold text-green">Demo Tip:</span> Badge: <strong>NIMC-ADM-001</strong> | Passcode: <strong>admin123</strong>
            </div>
          </form>
        )}

        {!selectedRole && (
          <div className="text-center py-6 border border-dashed border-surface-border rounded-xl bg-surface-soft/50">
            <p className="text-xs text-ink-secondary font-medium">Please select a role above to begin.</p>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-surface-border text-center">
          <p className="text-[10px] text-ink-muted">
            Official Federal Government Identity Gateway. NDPR Compliant.
          </p>
        </div>
      </motion.div>
    </div>
  );
}