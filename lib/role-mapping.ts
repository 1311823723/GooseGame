import fs from "node:fs";
import path from "node:path";
import fallbackMapping from "@/role_faction_map.json";
import type { Faction, MatchRecord } from "@/lib/sample-data";

type EditableRecord = Pick<MatchRecord, "id" | "matchId" | "date" | "playerName" | "faction" | "role" | "isWin">;
type RecognitionSource = Partial<{
  rawPlayerName: string;
  rawFaction: string;
  rawRole: string;
}>;
type MappingData = {
  _comment?: string;
  faction_map: Record<string, Faction>;
  role_alias: Record<string, string>;
  name_rules: {
    contains: Record<string, string>;
  };
};

const mappingPath = path.join(process.cwd(), "role_faction_map.json");

function loadMapping(): MappingData {
  try {
    return JSON.parse(fs.readFileSync(mappingPath, "utf-8")) as MappingData;
  } catch {
    return fallbackMapping as MappingData;
  }
}

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

function closestRole(role: string, validRoles: string[]) {
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
  const mapping = loadMapping();
  const factionMap = mapping.faction_map;
  const roleAlias = mapping.role_alias;
  const nameContains = mapping.name_rules.contains;
  const validRoles = Object.keys(factionMap);

  const mapped = records.map((record) => {
    let role = record.role.trim();
    role = roleAlias[role] ?? role;

    if (!factionMap[role]) {
      role = closestRole(role, validRoles);
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

export function learnRoleMappingFromCorrections<T extends EditableRecord & RecognitionSource>(rows: T[]) {
  const mapping = loadMapping();
  const factionMap = mapping.faction_map;
  const roleAlias = { ...mapping.role_alias };
  const nameContains = { ...mapping.name_rules.contains };
  const changes: string[] = [];

  rows.forEach((row) => {
    const rawRole = String(row.rawRole ?? "").trim();
    const finalRole = row.role.trim();
    if (rawRole && finalRole && rawRole !== finalRole && factionMap[finalRole] && roleAlias[rawRole] !== finalRole) {
      roleAlias[rawRole] = finalRole;
      changes.push(`职业别名：${rawRole} -> ${finalRole}`);
    }

    const rawName = String(row.rawPlayerName ?? "").trim();
    const finalName = row.playerName.trim();
    if (rawName && finalName && rawName.toUpperCase() !== finalName.toUpperCase() && nameContains[rawName] !== finalName) {
      nameContains[rawName] = finalName;
      changes.push(`玩家名：包含 ${rawName} -> ${finalName}`);
    }
  });

  if (!changes.length) {
    return { changed: false, changes: [] };
  }

  const nextMapping: MappingData = {
    ...mapping,
    role_alias: roleAlias,
    name_rules: {
      ...mapping.name_rules,
      contains: nameContains,
    },
  };
  fs.writeFileSync(mappingPath, `${JSON.stringify(nextMapping, null, 2)}\n`, "utf-8");
  return { changed: true, changes };
}
