"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserIdentity, SystemRole } from "./types";
import { citizenUser, institutionUser, governmentUser } from "./mockData";

interface AuthContextType {
  user: UserIdentity;
  role: SystemRole;
  switchRole: (role: SystemRole, nin?: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function userForRole(role: SystemRole): UserIdentity {
  switch (role) {
    case "institution":
      return institutionUser;
    case "government":
      return governmentUser;
    default:
      return citizenUser;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserIdentity>(citizenUser);
  const [role, setRole] = useState<SystemRole>("citizen");
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated && data.role) {
        setRole(data.role);
        setUser(userForRole(data.role));
      }
    } catch {
      // unauthenticated — default citizen mock
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const switchRole = async (newRole: SystemRole, nin?: string) => {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: newRole, nin }),
    });
    setRole(newRole);
    setUser(userForRole(newRole));
  };

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
    setRole("citizen");
    setUser(citizenUser);
  };

  return (
    <AuthContext.Provider value={{ user, role, switchRole, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
