import { NextResponse } from "next/server";
import { applyRoleMappingToRecords } from "@/lib/role-mapping";
import { EditableRecord, normalizeRecordRow, sanitizeEditableRows } from "@/lib/match-record-shared";
import {
  blobToDataUrl,
  executeTurso,
  parseCell,
  parseNumber,
  parseText,
} from "@/lib/turso-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function loadDates() {
  const { results, error } = await executeTurso([
    { sql: "select distinct date from match_records order by date desc" },
  ]);

  if (error) {
    return { dates: [], error };
  }

  return {
    dates: (results[0]?.rows ?? []).map((row) => parseText(parseCell(row[0]))).filter(Boolean),
    error: null,
  };
}

async function loadMatchSummaries(date: string) {
  const { results, error } = await executeTurso([
    {
      sql: `
        select
          r.match_id,
          min(r.date) as date,
          count(*) as players,
          case when i.match_id is null then 0 else 1 end as has_image
        from match_records r
        left join match_images i on i.match_id = r.match_id
        where r.date = ?
        group by r.match_id, i.match_id
        order by r.match_id desc
      `,
      args: [date],
    },
  ]);

  if (error) {
    return { matches: [], error };
  }

  return {
    matches: (results[0]?.rows ?? []).map((row) => {
      const [matchId, matchDate, players, hasImage] = row.map(parseCell);
      return {
        matchId: parseText(matchId),
        date: parseText(matchDate),
        players: parseNumber(players),
        hasImage: parseNumber(hasImage) > 0,
      };
    }),
    error: null,
  };
}

async function loadMatches(options: { matchId?: string; date?: string }) {
  const where = options.matchId ? "where match_id = ?" : options.date ? "where date = ?" : "";
  const args = options.matchId ? [options.matchId] : options.date ? [options.date] : undefined;
  const { results, error } = await executeTurso([
    {
      sql: `select id, match_id, date, player_name, faction, role, is_win from match_records ${where} order by match_id desc, id`,
      args,
    },
    {
      sql: options.matchId
        ? "select match_id, image from match_images where match_id = ?"
        : options.date
          ? "select match_id, image from match_images where match_id in (select distinct match_id from match_records where date = ?)"
          : "select match_id, image from match_images",
      args,
    },
  ]);

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
    matches: groupMatches((results[0]?.rows ?? []).map(normalizeRecordRow), imageByMatchId),
    error: null,
  };
}

async function persistRows(rows: EditableRecord[], deletedIds: number[] = []) {
  const statements = [
    ...deletedIds.map((id) => ({
      sql: "delete from match_records where id = ?",
      args: [id],
    })),
    ...rows.map((row) => (
      row.id > 0
        ? {
          sql: "update match_records set date = ?, player_name = ?, faction = ?, role = ?, is_win = ? where id = ? and match_id = ?",
          args: [row.date, row.playerName, row.faction, row.role, row.isWin ? 1 : 0, row.id, row.matchId],
        }
        : {
          sql: "insert into match_records (match_id, date, player_name, faction, role, is_win) values (?, ?, ?, ?, ?, ?)",
          args: [row.matchId, row.date, row.playerName, row.faction, row.role, row.isWin ? 1 : 0],
        }
    )),
  ];

  return executeTurso(statements);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const date = url.searchParams.get("date") ?? "";
  const matchId = url.searchParams.get("matchId") ?? "";

  if (mode === "dates") {
    const { dates, error } = await loadDates();
    return error
      ? NextResponse.json({ dates: [], error }, { status: 500 })
      : NextResponse.json({ dates });
  }

  if (mode === "summaries") {
    if (!date) {
      return NextResponse.json({ matches: [], error: "请先选择日期。" }, { status: 400 });
    }
    const { matches, error } = await loadMatchSummaries(date);
    return error
      ? NextResponse.json({ matches: [], error }, { status: 500 })
      : NextResponse.json({ matches });
  }

  if (!matchId) {
    return NextResponse.json({ matches: [], error: "请先选择对局。" }, { status: 400 });
  }

  const { matches, error } = await loadMatches({ matchId });
  return error
    ? NextResponse.json({ matches: [], error }, { status: 500 })
    : NextResponse.json({ match: matches[0] ?? null });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null) as { matchId?: unknown; rows?: unknown; deletedIds?: unknown } | null;
  const matchId = parseText(body?.matchId);
  const rows = sanitizeEditableRows(body?.rows, matchId);
  const deletedIds = Array.isArray(body?.deletedIds)
    ? body.deletedIds.map((id) => parseNumber(id)).filter((id) => id > 0)
    : [];

  if (!matchId || (!rows?.length && !deletedIds.length)) {
    return NextResponse.json({ error: "提交数据不完整。" }, { status: 400 });
  }

  const { error } = await persistRows(rows ?? [], deletedIds);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const reloaded = await loadMatches({ matchId });
  return NextResponse.json({ match: reloaded.matches[0] ?? null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { action?: unknown; matchId?: unknown; date?: unknown } | null;
  const action = parseText(body?.action);
  const matchId = parseText(body?.matchId);
  const date = parseText(body?.date);

  if (action !== "apply-mapping") {
    return NextResponse.json({ error: "未知操作。" }, { status: 400 });
  }

  if (!matchId && !date) {
    return NextResponse.json({ error: "请先选择日期或对局。" }, { status: 400 });
  }

  const loaded = await loadMatches(matchId ? { matchId } : { date });
  if (loaded.error) {
    return NextResponse.json({ error: loaded.error }, { status: 500 });
  }

  const rows = loaded.matches.flatMap((match) => match.rows);
  const mapped = applyRoleMappingToRecords(rows);
  const { error } = await persistRows(mapped);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const reloaded = await loadMatches(matchId ? { matchId } : { date });
  return NextResponse.json({
    matches: reloaded.matches,
    match: matchId ? reloaded.matches[0] ?? null : undefined,
    changedRows: mapped.length,
  });
}
