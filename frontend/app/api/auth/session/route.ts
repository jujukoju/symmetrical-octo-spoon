import { NextRequest, NextResponse } from "next/server";
import type { SystemRole } from "@/lib/types";
import {
  COOKIE_NAME,
  sessionCookieOptions,
  signPayload,
  verifySignedToken,
  type SessionPayload,
} from "@/lib/session-token";

const SESSION_TTL = 60 * 60 * 8; // 8 hours

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const payload = await verifySignedToken<SessionPayload>(token);
  if (!payload || payload.exp < Date.now()) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    role: payload.role,
    nin: payload.nin,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = body.role as SystemRole;
    if (!["citizen", "institution", "government"].includes(role)) {
      return NextResponse.json({ detail: "Invalid role." }, { status: 400 });
    }

    const exp = Date.now() + SESSION_TTL * 1000;
    const payload: SessionPayload = {
      role,
      nin: typeof body.nin === "string" ? body.nin : undefined,
      exp,
    };

    const token = await signPayload(payload);
    const response = NextResponse.json({ authenticated: true, role, nin: payload.nin });
    response.cookies.set(COOKIE_NAME, token, sessionCookieOptions(SESSION_TTL));
    return response;
  } catch {
    return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
