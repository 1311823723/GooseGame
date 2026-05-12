import mapping from "@/role_faction_map.json";
import type { Faction, MatchRecord } from "@/lib/sample-data";

type EditableRecord = Pick<MatchRecord, "id" | "matchId" | "date" | "playerName" | "faction" | "role" | "isWin">;

const factionMap = mapping.faction_map as Record<string, Faction>;
const roleAlias = mapping.role_alias as Record<string, string>;
const nameContains = mapping.name_rules.contains as Record<string, string>;
const validRoles = Object.keys(factionMap);

function distance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function closestRole(role: string) {
  let best = role;
  let bestScore = 0;

  validRoles.forEach((candidate) => {
    const maxLength = Math.max(role.length, candidate.length, 1);
    const score = 1 - distance(role, candidate) / maxLength;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });

  return bestScore >= 0.5 ? best : role;
}

export function applyRoleMappingToRecords<T extends EditableRecord>(records: T[]) {
  const mapped = records.map((record) => {
    let role = record.role.trim();
    role = roleAlias[role] ?? role;

    if (!factionMap[role]) {
      role = closestRole(role);
    }

    let playerName = record.playerName.trim();
    Object.entries(nameContains).some(([fragment, canonicalName]) => {
      if (playerName.includes(fragment)) {
        playerName = canonicalName;
        return true;
      }
      return false;
    });

    return {
      ...record,
      role,
      playerName: playerName.toUpperCase(),
      faction: factionMap[role] ?? record.faction,
    };
  });

  const winningPairs = new Set(
    mapped
      .filter((record) => record.isWin && (record.faction === "鹅" || record.faction === "鸭"))
      .map((record) => `${record.matchId}:${record.faction}`),
  );

  return mapped.map((record) => ({
    ...record,
    isWin: record.faction === "鹅" || record.faction === "鸭"
      ? record.isWin || winningPairs.has(`${record.matchId}:${record.faction}`)
      : record.isWin,
  }));
}
