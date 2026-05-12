import type { Faction, MatchRecord } from "@/lib/sample-data";
import { parseBoolean, parseCell, parseNumber, parseText } from "@/lib/turso-http";

export type EditableRecord = Pick<MatchRecord, "id" | "matchId" | "date" | "playerName" | "faction" | "role" | "isWin">;

export const allowedFactions: Faction[] = ["鹅", "鸭", "中立"];

export function parseFaction(value: unknown): Faction {
  return value === "鹅" || value === "鸭" || value === "中立" ? value : "中立";
}

export function normalizeRecordRow(row: Parameters<typeof parseCell>[0][]): EditableRecord {
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

export function sanitizeEditableRows(rows: unknown, fallbackMatchId?: string): EditableRecord[] | null {
  if (!Array.isArray(rows)) {
    return null;
  }

  const sanitized = rows.map((row, index) => {
    const item = row as Partial<EditableRecord>;
    const matchId = parseText(item.matchId || fallbackMatchId);
    return {
      id: parseNumber(item.id) || -(index + 1),
      matchId,
      date: parseText(item.date),
      playerName: parseText(item.playerName),
      faction: parseFaction(item.faction),
      role: parseText(item.role),
      isWin: parseBoolean(item.isWin),
    };
  }).filter((row) => {
    const matchIdMatches = fallbackMatchId ? row.matchId === fallbackMatchId : Boolean(row.matchId);
    return matchIdMatches && row.date && row.playerName && row.role;
  });

  return sanitized.length ? sanitized : null;
}
