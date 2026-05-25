import type { SystemRole } from "./types";

export interface SessionPayload {
  role: SystemRole;
  nin?: string;
  exp: number;
}

const COOKIE_NAME = "ninauth_session";
const CHALLENGE_COOKIE = "ninauth_challenge";

function getSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    "dev-only-session-secret-change-me";
  if (secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters.");
  }
  return secret;
}

// ── Helper: Import the secret key into the Web Crypto API ──────────────────
async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// ── Refactored functions (Now Async!) ──────────────────────────────────────

export async function signPayload(payload: object): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");

  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );

  // Convert ArrayBuffer signature to base64url string
  const sig = Buffer.from(signatureBuffer).toString("base64url");

  return `${data}.${sig}`;
}

export async function verifySignedToken<T extends object>(token: string): Promise<T | null> {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  // Generate the expected signature
  const key = await getHmacKey();
  const expectedSigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  const expectedSig = Buffer.from(expectedSigBuffer).toString("base64url");

  // Constant-time comparison (prevents timing attacks)
  if (sig.length !== expectedSig.length) return null;
  let isValid = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== expectedSig[i]) {
      isValid = false;
    }
  }

  if (!isValid) return null;

  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export { COOKIE_NAME, CHALLENGE_COOKIE };

export async function createChallengeToken(challengeB64: string): Promise<string> {
  const exp = Date.now() + 5 * 60 * 1000;
  return await signPayload({ challenge: challengeB64, exp });
}

export async function verifyChallengeToken(
  token: string,
  challengeB64: string
): Promise<boolean> {
  const payload = await verifySignedToken<{ challenge: string; exp: number }>(token);
  if (!payload) return false;
  if (payload.exp < Date.now()) return false;
  return payload.challenge === challengeB64;
}