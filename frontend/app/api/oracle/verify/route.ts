import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ORACLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ detail: "Server configuration error." }, { status: 503 });
  }

  const formData = await request.formData();
  const oracleUrl = process.env.ORACLE_API_URL ?? "http://localhost:8000";

  try {
    const oracleResponse = await fetch(`${oracleUrl}/v1/verify`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
      },
      body: formData,
    });

    const data = await oracleResponse.json().catch(() => ({}));
    return NextResponse.json(data, { status: oracleResponse.status });
  } catch {
    return NextResponse.json({ detail: "Identity Oracle is unreachable." }, { status: 503 });
  }
}
