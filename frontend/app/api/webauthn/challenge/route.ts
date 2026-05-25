import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  CHALLENGE_COOKIE,
  createChallengeToken,
  sessionCookieOptions,
} from "@/lib/session-token";

const CHALLENGE_RATE = new Map<string, number>();

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const last = CHALLENGE_RATE.get(ip) ?? 0;
  if (now - last < 1000) {
    return NextResponse.json({ detail: "Too many requests." }, { status: 429 });
  }
  CHALLENGE_RATE.set(ip, now);

  const challenge = crypto.randomBytes(32);
  const challengeB64 = challenge.toString("base64url");
  const signed = createChallengeToken(challengeB64);

  const response = NextResponse.json(
    { challenge: challengeB64 },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }
  );

  response.cookies.set(CHALLENGE_COOKIE, signed, sessionCookieOptions(300));
  return response;
}
