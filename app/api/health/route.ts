import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckResult = {
  configured: boolean;
  ok: boolean;
  message: string;
};

function configured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

async function checkTurso(): Promise<CheckResult> {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (!configured(url) || !configured(token)) {
    return {
      configured: false,
      ok: false,
      message: "Turso env vars are missing.",
    };
  }

  if (!url?.startsWith("libsql://")) {
    return {
      configured: true,
      ok: false,
      message: "TURSO_DATABASE_URL must start with libsql://.",
    };
  }

  const hostname = url.replace("libsql://", "");
  const response = await fetch(`https://${hostname}/v2/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql: "select 1 as ok" } },
        { type: "close" },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      configured: true,
      ok: false,
      message: `Turso returned HTTP ${response.status}.`,
    };
  }

  const body = await response.json();
  const firstResult = body?.results?.[0];
  const hasRow = Boolean(firstResult?.response?.result?.rows?.[0]);

  return {
    configured: true,
    ok: hasRow,
    message: hasRow ? "Turso query succeeded." : "Turso responded without a result row.",
  };
}

async function checkDashScope(): Promise<CheckResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  if (!configured(apiKey)) {
    return {
      configured: false,
      ok: false,
      message: "DASHSCOPE_API_KEY is missing.",
    };
  }

  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  return {
    configured: true,
    ok: response.ok,
    message: response.ok ? "DashScope key is accepted." : `DashScope returned HTTP ${response.status}.`,
  };
}

export async function GET() {
  const [turso, dashscope] = await Promise.allSettled([checkTurso(), checkDashScope()]);

  const result = {
    timestamp: new Date().toISOString(),
    runtime: "vercel",
    turso: turso.status === "fulfilled"
      ? turso.value
      : { configured: true, ok: false, message: "Turso check threw an error." },
    dashscope: dashscope.status === "fulfilled"
      ? dashscope.value
      : { configured: true, ok: false, message: "DashScope check threw an error." },
  };

  return NextResponse.json(result, {
    status: result.turso.ok && result.dashscope.ok ? 200 : 503,
  });
}
