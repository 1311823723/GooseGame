import "server-only";

import type { Faction, MatchRecord } from "@/lib/sample-data";

type TursoCell = {
  type?: string;
  value?: unknown;
};

type TursoResponse = {
  results?: Array<{
    response?: {
      result?: {
        rows?: TursoCell[][];
      };
    };
  }>;
};

function parseCell(cell: TursoCell | undefined) {
  if (!cell) {
    return null;
  }

  if (cell.type === "integer" || cell.type === "float") {
    const numericValue = Number(cell.value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  if (cell.type === "null") {
    return null;
  }

  return cell.value ?? null;
}

function parseNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function parseText(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function parseBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return value === "1" || value === "true";
}

function parseFaction(value: unknown): Faction {
  return value === "鹅" || value === "鸭" || value === "中立" ? value : "中立";
}

function normalizeRow(row: TursoCell[]): MatchRecord {
  const [id, matchId, date, playerName, faction, role, isWin] = row.map(parseCell);

  return {
    id: parseNumber(id),
    matchId: parseText(matchId),
    date: parseText(date),
    playerName: parseText(playerName),
    faction: parseFaction(faction),
    role: parseText(role),
    isWin: parseBoolean(isWin),
  };
}

export async function fetchMatchRecords(): Promise<{ records: MatchRecord[]; error: string | null }> {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  if (typeof url !== "string" || url.trim() === "" || typeof token !== "string" || token.trim() === "") {
    return {
      records: [],
      error: "Turso 环境变量未配置，当前无法读取真实战绩数据。",
    };
  }

  const databaseUrl = url;
  const authToken = token;

  if (!databaseUrl.startsWith("libsql://")) {
    return {
      records: [],
      error: "TURSO_DATABASE_URL 配置无效。",
    };
  }

  try {
    const hostname = databaseUrl.replace("libsql://", "");
    const response = await fetch(`https://${hostname}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            type: "execute",
            stmt: {
              sql: "select id, match_id, date, player_name, faction, role, is_win from match_records order by id desc",
            },
          },
          { type: "close" },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        records: [],
        error: `Turso 请求失败（HTTP ${response.status}）。`,
      };
    }

    const body = (await response.json()) as TursoResponse;
    const rows = body.results?.[0]?.response?.result?.rows ?? [];

    return {
      records: rows.map(normalizeRow),
      error: null,
    };
  } catch {
    return {
      records: [],
      error: "读取 Turso 数据时发生错误。",
    };
  }
}
