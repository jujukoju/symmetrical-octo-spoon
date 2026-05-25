import { NextRequest, NextResponse } from "next/server";

const ENROLL_RATE = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ENROLL_RATE.get(ip);
  if (!entry || now > entry.reset) {
    ENROLL_RATE.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(ip)) {
    return NextResponse.json({ detail: "Too many requests." }, { status: 429 });
  }

  const apiKey = process.env.ORACLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ detail: "Server configuration error." }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: "Invalid Form Data." }, { status: 400 });
  }

  const oracleUrl = process.env.ORACLE_API_URL ?? "http://localhost:8000";

  try {
    const oracleResponse = await fetch(`${oracleUrl}/v1/enroll`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-Forwarded-For": ip,
      },
      body: formData,
    });

    const data = await oracleResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: oracleResponse.status });
  } catch {
    return NextResponse.json({ detail: "Identity Oracle is unreachable." }, { status: 503 });
  }
}

