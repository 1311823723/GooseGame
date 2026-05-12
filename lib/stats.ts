import { AttendanceRecord, Faction, MatchRecord, timeNodes } from "./sample-data";

export const factionMeta: Record<Faction, { label: string; color: string; soft: string }> = {
  鹅: { label: "鹅", color: "#12b981", soft: "rgba(18, 185, 129, 0.13)" },
  鸭: { label: "鸭", color: "#f43f5e", soft: "rgba(244, 63, 94, 0.13)" },
  中立: { label: "中立", color: "#8b5cf6", soft: "rgba(139, 92, 246, 0.13)" },
};

export function buildAttendance(records: AttendanceRecord[]) {
  const slots = timeNodes.slice(0, -1).map((slot) => ({
    slot,
    count: 0,
    players: [] as string[],
  }));

  records.forEach((record) => {
    const joinIndex = timeNodes.indexOf(record.joinTime);
    const leaveIndex = timeNodes.indexOf(record.leaveTime);
    for (let index = joinIndex; index < leaveIndex; index += 1) {
      if (slots[index]) {
        slots[index].count += 1;
        slots[index].players.push(record.name);
      }
    }
  });

  return slots;
}

export function buildFactionSummary(records: MatchRecord[]) {
  const byMatchFaction = new Map<string, { faction: Faction; didWin: boolean }>();
  records.forEach((record) => {
    const key = `${record.matchId}:${record.faction}`;
    const current = byMatchFaction.get(key);
    byMatchFaction.set(key, {
      faction: record.faction,
      didWin: Boolean(current?.didWin || record.isWin),
    });
  });

  const summary = new Map<Faction, { faction: Faction; matches: number; wins: number }>();
  byMatchFaction.forEach((item) => {
    const current = summary.get(item.faction) || {
      faction: item.faction,
      matches: 0,
      wins: 0,
    };
    current.matches += 1;
    current.wins += item.didWin ? 1 : 0;
    summary.set(item.faction, current);
  });

  return Array.from(summary.values()).map((item) => ({
    ...item,
    rate: item.matches ? item.wins / item.matches : 0,
  }));
}

export function buildRoleSummary(records: MatchRecord[]) {
  const summary = new Map<string, { role: string; plays: number; wins: number }>();
  records.forEach((record) => {
    const current = summary.get(record.role) || { role: record.role, plays: 0, wins: 0 };
    current.plays += 1;
    current.wins += record.isWin ? 1 : 0;
    summary.set(record.role, current);
  });

  return Array.from(summary.values())
    .map((item) => ({ ...item, rate: item.plays ? item.wins / item.plays : 0 }))
    .sort((a, b) => b.rate - a.rate || b.plays - a.plays);
}

export function buildMatchCards(records: MatchRecord[]) {
  const grouped = new Map<string, MatchRecord[]>();
  records.forEach((record) => {
    grouped.set(record.matchId, [...(grouped.get(record.matchId) || []), record]);
  });

  return Array.from(grouped.entries())
    .map(([matchId, rows]) => {
      const winners = rows.filter((row) => row.isWin);
      return {
        matchId,
        date: rows[0]?.date || "",
        players: rows.length,
        winners: winners.map((row) => row.playerName).join("、") || "暂无",
        factions: Array.from(new Set(winners.map((row) => row.faction))).join("、") || "暂无",
        rows,
      };
    })
    .sort((a, b) => b.matchId.localeCompare(a.matchId));
}
