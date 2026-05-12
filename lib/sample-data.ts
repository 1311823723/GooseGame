export type Faction = "鹅" | "鸭" | "中立";

export type MatchRecord = {
  id: number;
  matchId: string;
  date: string;
  playerName: string;
  faction: Faction;
  role: string;
  isWin: boolean;
};

export type AttendanceRecord = {
  name: string;
  joinTime: string;
  leaveTime: string;
};

export const timeNodes = [
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "24:00",
];

export const attendanceRecords: AttendanceRecord[] = [
  { name: "灰焕", joinTime: "20:00", leaveTime: "23:00" },
  { name: "微笑尅乐", joinTime: "20:30", leaveTime: "24:00" },
  { name: "荷鲁斯·卢佩卡尔", joinTime: "21:00", leaveTime: "23:30" },
  { name: "青团", joinTime: "21:30", leaveTime: "24:00" },
  { name: "Moon", joinTime: "20:00", leaveTime: "22:30" },
];

export const matchRecords: MatchRecord[] = [
  {
    id: 1,
    matchId: "2026-05-12-a91f2b",
    date: "2026-05-12",
    playerName: "灰焕",
    faction: "鹅",
    role: "侦探",
    isWin: true,
  },
  {
    id: 2,
    matchId: "2026-05-12-a91f2b",
    date: "2026-05-12",
    playerName: "微笑尅乐",
    faction: "鹅",
    role: "工程师",
    isWin: true,
  },
  {
    id: 3,
    matchId: "2026-05-12-a91f2b",
    date: "2026-05-12",
    playerName: "荷鲁斯·卢佩卡尔",
    faction: "鸭",
    role: "刺客",
    isWin: false,
  },
  {
    id: 4,
    matchId: "2026-05-12-b14c8e",
    date: "2026-05-12",
    playerName: "青团",
    faction: "中立",
    role: "猎鹰",
    isWin: true,
  },
  {
    id: 5,
    matchId: "2026-05-12-b14c8e",
    date: "2026-05-12",
    playerName: "Moon",
    faction: "鸭",
    role: "间谍",
    isWin: false,
  },
  {
    id: 6,
    matchId: "2026-05-11-f82a55",
    date: "2026-05-11",
    playerName: "灰焕",
    faction: "鸭",
    role: "隐形者",
    isWin: true,
  },
];
