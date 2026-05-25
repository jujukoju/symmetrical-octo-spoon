import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySignedToken, type SessionPayload } from "@/lib/session-token";

const PROTECTED_PREFIXES = ["/citizen", "/gov", "/institution"];
const PROTECTED_EXACT = ["/identity", "/register-identity", "/governance", "/verifications"];

function isProtected(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return PROTECTED_EXACT.includes(pathname);
}

function dashboardForRole(role: string): string {
  switch (role) {
    case "institution":
      return "/institution/dashboard";
    case "government":
      return "/gov/dashboard";
    default:
      return "/citizen/dashboard";
  }
}

// ── FIX: Added `async` to the middleware function ───────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // ── FIX: Added `await` because verifySignedToken now uses Web Crypto ──────
  const payload = token ? await verifySignedToken<SessionPayload>(token) : null;
  const valid = payload && payload.exp > Date.now();

  if (!valid) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/citizen") && payload.role !== "citizen") {
    return NextResponse.redirect(new URL(dashboardForRole(payload.role), request.url));
  }
  if (pathname.startsWith("/institution") && payload.role !== "institution") {
    return NextResponse.redirect(new URL(dashboardForRole(payload.role), request.url));
  }
  if (pathname.startsWith("/gov") && payload.role !== "government") {
    return NextResponse.redirect(new URL(dashboardForRole(payload.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/citizen/:path*",
    "/gov/:path*",
    "/institution/:path*",
    "/identity",
    "/register-identity",
    "/governance",
    "/verifications",
  ],
};