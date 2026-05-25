import { NextResponse } from "next/server";

export async function GET() {
  const oracleUrl = process.env.ORACLE_API_URL ?? "http://localhost:8000";

  try {
    const res = await fetch(`${oracleUrl}/health`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Oracle API unreachable." }, { status: 503 });
  }
}
