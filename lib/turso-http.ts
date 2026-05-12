import "server-only";

export type TursoCell = {
  type?: string;
  value?: unknown;
};

export type TursoResult = {
  cols: { name: string }[];
  rows: TursoCell[][];
  affectedRowCount: number;
};

type TursoResponse = {
  results?: Array<{
    response?: {
      result?: {
        cols?: { name: string }[];
        rows?: TursoCell[][];
        affected_row_count?: number;
      };
    };
  }>;
};

type BlobArg = {
  blobBase64: string;
};

export function tursoBlob(base64: string): BlobArg {
  return { blobBase64: base64 };
}

export function getTursoConfig() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (typeof url !== "string" || url.trim() === "" || typeof token !== "string" || token.trim() === "") {
    return { ok: false as const, error: "Turso 环境变量未配置，当前无法读取真实战绩数据。" };
  }

  if (!url.startsWith("libsql://")) {
    return { ok: false as const, error: "TURSO_DATABASE_URL 配置无效。" };
  }

  return {
    ok: true as const,
    endpoint: `https://${url.replace("libsql://", "")}/v2/pipeline`,
    token,
  };
}

function tursoArg(value: unknown) {
  if (value == null) {
    return { type: "null" };
  }

  if (typeof value === "object" && value !== null && "blobBase64" in value) {
    return { type: "blob", value: String((value as BlobArg).blobBase64) };
  }

  if (typeof value === "boolean") {
    return { type: "integer", value: value ? "1" : "0" };
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? { type: "integer", value: value.toString() }
      : { type: "float", value };
  }

  return { type: "text", value: String(value) };
}

export async function executeTurso(
  statements: Array<{ sql: string; args?: unknown[] }>,
): Promise<{ results: TursoResult[]; error: string | null }> {
  const config = getTursoConfig();

  if (!config.ok) {
    return { results: [], error: config.error };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          ...statements.map((statement) => ({
            type: "execute",
            stmt: {
              sql: statement.sql,
              args: statement.args?.map(tursoArg),
            },
          })),
          { type: "close" },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { results: [], error: `Turso 请求失败（HTTP ${response.status}）。` };
    }

    const body = (await response.json()) as TursoResponse;
    const results = (body.results ?? []).slice(0, statements.length).map((entry) => {
      const result = entry.response?.result;
      return {
        cols: result?.cols ?? [],
        rows: result?.rows ?? [],
        affectedRowCount: result?.affected_row_count ?? 0,
      };
    });

    return { results, error: null };
  } catch {
    return { results: [], error: "读取 Turso 数据时发生错误。" };
  }
}

export function parseCell(cell: TursoCell | undefined) {
  if (!cell || cell.type === "null") {
    return null;
  }

  if (cell.type === "integer" || cell.type === "float") {
    const numericValue = Number(cell.value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return cell.value ?? null;
}

export function parseNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function parseText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return value === "1" || value === "true";
}

export function blobToDataUrl(value: unknown) {
  const base64 = parseText(value);

  if (!base64) {
    return undefined;
  }

  const mimeType = base64.startsWith("/9j/")
    ? "image/jpeg"
    : base64.startsWith("R0lG")
      ? "image/gif"
      : base64.startsWith("UklGR")
        ? "image/webp"
        : "image/png";

  return `data:${mimeType};base64,${base64}`;
}
