"use client";

import { useAuth } from "@/lib/auth-context";
import { SystemRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allowedRoles: SystemRole[];
}

export function RoleGuard({ children, allowedRoles }: Props) {
  const { role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !allowedRoles.includes(role)) {
      router.replace("/login");
    }
  }, [role, isLoading, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green" />
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-ink">Access Restricted</h2>
        <p className="mt-2 text-ink-secondary">
          Your current role (<span className="font-bold uppercase">{role}</span>) does not have permission to access this page.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-surface-border px-6 py-2.5 text-sm font-semibold hover:bg-surface-soft transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
