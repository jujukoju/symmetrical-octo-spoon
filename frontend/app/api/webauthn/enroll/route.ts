import { NextRequest, NextResponse } from "next/server";
import { CHALLENGE_COOKIE, verifyChallengeToken } from "@/lib/session-token";

/**
 * POST /api/webauthn/enroll
 * Validates WebAuthn challenge cookie, then proxies to Oracle /v1/enroll.
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.ORACLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ detail: "Server configuration error." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const challengeCookie = request.cookies.get(CHALLENGE_COOKIE)?.value;
  const clientData = typeof body.client_data === "string" ? body.client_data : "";

  if (clientData && challengeCookie) {
    try {
      const clientJson = JSON.parse(
        Buffer.from(clientData, "base64url").toString("utf8")
      ) as { challenge?: string };
      const challengeFromClient = clientJson.challenge;
      if (
        !challengeFromClient ||
        !verifyChallengeToken(challengeCookie, challengeFromClient)
      ) {
        return NextResponse.json({ detail: "Invalid or expired WebAuthn challenge." }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ detail: "Invalid client_data payload." }, { status: 400 });
    }
  } else if (body.credential_id && !challengeCookie) {
    return NextResponse.json({ detail: "Missing WebAuthn challenge session." }, { status: 400 });
  }

  const oracleUrl = process.env.ORACLE_API_URL ?? "http://localhost:8000";

  try {
    const oracleResponse = await fetch(`${oracleUrl}/v1/enroll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify(body),
    });

    const data = await oracleResponse.json().catch(() => ({}));
    const response = NextResponse.json(data, { status: oracleResponse.status });
    if (oracleResponse.ok) {
      response.cookies.set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return response;
  } catch {
    return NextResponse.json({ detail: "Identity Oracle is unreachable." }, { status: 503 });
  }
}
