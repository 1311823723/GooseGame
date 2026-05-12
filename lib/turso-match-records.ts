import "server-only";

import type { Faction, MatchRecord } from "@/lib/sample-data";
import {
  blobToDataUrl,
  executeTurso,
  parseBoolean,
  parseCell,
  parseNumber,
  parseText,
} from "@/lib/turso-http";

function parseFaction(value: unknown): Faction {
  return value === "鹅" || value === "鸭" || value === "中立" ? value : "中立";
}

function normalizeRow(row: Parameters<typeof parseCell>[0][], imageByMatchId: Map<string, string>): MatchRecord {
  const [id, matchId, date, playerName, faction, role, isWin] = row.map(parseCell);
  const normalizedMatchId = parseText(matchId);

  return {
    id: parseNumber(id),
    matchId: normalizedMatchId,
    date: parseText(date),
    playerName: parseText(playerName),
    faction: parseFaction(faction),
    role: parseText(role),
    isWin: parseBoolean(isWin),
    imageDataUrl: imageByMatchId.get(normalizedMatchId),
  };
}

export async function fetchMatchDates(): Promise<{ dates: string[]; latestDate: string; error: string | null }> {
  const { results, error } = await executeTurso([
    { sql: "select distinct date from match_records order by date desc" },
  ]);

  if (error) {
    return { dates: [], latestDate: "", error };
  }

  const dates = (results[0]?.rows ?? [])
    .map((row) => parseText(parseCell(row[0])))
    .filter(Boolean);

  return {
    dates,
    latestDate: dates[0] ?? "",
    error: null,
  };
}

export async function fetchMatchRecords(date?: string): Promise<{ records: MatchRecord[]; error: string | null }> {
  const targetDate = date === "全部" ? "" : date;
  const recordSql = targetDate
    ? "select id, match_id, date, player_name, faction, role, is_win from match_records where date = ? order by id desc"
    : "select id, match_id, date, player_name, faction, role, is_win from match_records order by id desc";
  const imageSql = targetDate
    ? "select match_id, image from match_images where match_id in (select distinct match_id from match_records where date = ?)"
    : "select match_id, image from match_images";
  const args = targetDate ? [targetDate] : undefined;
  const { results, error } = await executeTurso([
    { sql: recordSql, args },
    { sql: imageSql, args },
  ]);

  if (error) {
    return { records: [], error };
  }

  const imageByMatchId = new Map<string, string>();
  (results[1]?.rows ?? []).forEach((row) => {
    const [matchId, image] = row.map(parseCell);
    const imageDataUrl = blobToDataUrl(image);
    if (imageDataUrl) {
      imageByMatchId.set(parseText(matchId), imageDataUrl);
    }
  });

  return {
    records: (results[0]?.rows ?? []).map((row) => normalizeRow(row, imageByMatchId)),
    error: null,
  };
}
