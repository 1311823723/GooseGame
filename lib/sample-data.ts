export type Faction = "鹅" | "鸭" | "中立";

export type MatchRecord = {
  id: number;
  matchId: string;
  date: string;
  playerName: string;
  faction: Faction;
  role: string;
  isWin: boolean;
  imageDataUrl?: string;
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
