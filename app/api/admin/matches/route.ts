import { NextResponse } from "next/server";
import type { Faction, MatchRecord } from "@/lib/sample-data";
import { applyRoleMappingToRecords } from "@/lib/role-mapping";
import {
  blobToDataUrl,
  executeTurso,
  parseBoolean,
  parseCell,
  parseNumber,
  parseText,
} from "@/lib/turso-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditableRecord = Pick<MatchRecord, "id" | "matchId" | "date" | "playerName" | "faction" | "role" | "isWin">;

function parseFaction(value: unknown): Faction {
  return value === "鹅" || value === "鸭" || value === "中立" ? value : "中立";
}

function normalizeRecord(row: Parameters<typeof parseCell>[0][]): EditableRecord {
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

function groupMatches(records: EditableRecord[], imageByMatchId: Map<string, string>) {
  const grouped = new Map<string, EditableRecord[]>();
  records.forEach((record) => {
    grouped.set(record.matchId, [...(grouped.get(record.matchId) ?? []), record]);
  });

  return Array.from(grouped.entries()).map(([matchId, rows]) => ({
    matchId,
    date: rows[0]?.date ?? "",
    players: rows.length,
    imageDataUrl: imageByMatchId.get(matchId),
    rows,
  }));
}

async function loadMatches(matchId?: string) {
  const statements = [
    {
      sql: matchId
        ? "select id, match_id, date, player_name, faction, role, is_win from match_records where match_id = ? order by id"
        : "select id, match_id, date, player_name, faction, role, is_win from match_records order by match_id desc, id",
      args: matchId ? [matchId] : undefined,
    },
    {
      sql: matchId
        ? "select match_id, image from match_images where match_id = ?"
        : "select match_id, image from match_images",
      args: matchId ? [matchId] : undefined,
    },
  ];
  const { results, error } = await executeTurso(statements);

  if (error) {
    return { matches: [], error };
  }

  const imageByMatchId = new Map<string, string>();
  (results[1]?.rows ?? []).forEach((row) => {
    const [id, image] = row.map(parseCell);
    const imageDataUrl = blobToDataUrl(image);
    if (imageDataUrl) {
      imageByMatchId.set(parseText(id), imageDataUrl);
    }
  });

  return {
    matches: groupMatches((results[0]?.rows ?? []).map(normalizeRecord), imageByMatchId),
    error: null,
  };
}

function sanitizeRows(rows: unknown, fallbackMatchId: string): EditableRecord[] | null {
  if (!Array.isArray(rows)) {
    return null;
  }

  return rows.map((row) => {
    const item = row as Partial<EditableRecord>;
    return {
      id: parseNumber(item.id),
      matchId: parseText(item.matchId || fallbackMatchId),
      date: parseText(item.date),
      playerName: parseText(item.playerName),
      faction: parseFaction(item.faction),
      role: parseText(item.role),
      isWin: parseBoolean(item.isWin),
    };
  }).filter((row) => row.id > 0 && row.matchId === fallbackMatchId && row.date && row.playerName && row.role);
}

async function persistRows(rows: EditableRecord[]) {
  return executeTurso(rows.map((row) => ({
    sql: "update match_records set date = ?, player_name = ?, faction = ?, role = ?, is_win = ? where id = ? and match_id = ?",
    args: [row.date, row.playerName, row.faction, row.role, row.isWin ? 1 : 0, row.id, row.matchId],
  })));
}

export async function GET() {
  const { matches, error } = await loadMatches();

  if (error) {
    return NextResponse.json({ matches: [], error }, { status: 500 });
  }

  return NextResponse.json({ matches });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as { matchId?: unknown; rows?: unknown } | null;
  const matchId = parseText(body?.matchId);
  const rows = sanitizeRows(body?.rows, matchId);

  if (!matchId || !rows?.length) {
    return NextResponse.json({ error: "提交数据不完整。" }, { status: 400 });
  }

  const { error } = await persistRows(rows);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const reloaded = await loadMatches(matchId);
  return NextResponse.json({ match: reloaded.matches[0] ?? null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { action?: unknown; matchId?: unknown } | null;
  const action = parseText(body?.action);
  const matchId = parseText(body?.matchId);

  if (action !== "apply-mapping") {
    return NextResponse.json({ error: "未知操作。" }, { status: 400 });
  }

  const loaded = await loadMatches(matchId || undefined);
  if (loaded.error) {
    return NextResponse.json({ error: loaded.error }, { status: 500 });
  }

  const rows = loaded.matches.flatMap((match) => match.rows);
  const mapped = applyRoleMappingToRecords(rows);
  const { error } = await persistRows(mapped);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const reloaded = await loadMatches(matchId || undefined);
  return NextResponse.json({
    matches: reloaded.matches,
    changedRows: mapped.length,
  });
}
