"use client";

import { useMemo, useState } from "react";
import {
  attendanceRecords,
  matchRecords,
  MatchRecord,
  timeNodes,
} from "@/lib/sample-data";
import {
  buildAttendance,
  buildFactionSummary,
  buildMatchCards,
  buildRoleSummary,
  factionMeta,
} from "@/lib/stats";

type View = "dashboard" | "attendance" | "matches" | "admin";

const navItems: { id: View; label: string }[] = [
  { id: "dashboard", label: "数据大厅" },
  { id: "attendance", label: "发车" },
  { id: "matches", label: "对局" },
  { id: "admin", label: "入库" },
];

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [selectedSlot, setSelectedSlot] = useState("21:30");
  const attendance = useMemo(() => buildAttendance(attendanceRecords), []);
  const factionSummary = useMemo(() => buildFactionSummary(matchRecords), []);
  const roleSummary = useMemo(() => buildRoleSummary(matchRecords), []);
  const matchCards = useMemo(() => buildMatchCards(matchRecords), []);
  const slot = attendance.find((item) => item.slot === selectedSlot) || attendance[0];
  const peak = Math.max(...attendance.map((item) => item.count));

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">GooseGame</p>
          <h1>鹅鸭杀发车助手</h1>
          <p className="heroCopy">今晚人数、战绩胜率、每局身份，一屏拉齐。</p>
        </div>
        <div className="heroStats" aria-label="核心数据">
          <Metric label="已登记" value={attendanceRecords.length.toString()} tone="green" />
          <Metric label="峰值在线" value={peak.toString()} tone="cyan" />
          <Metric label="已入库" value={matchRecords.length.toString()} tone="rose" />
        </div>
      </section>

      <nav className="viewNav" aria-label="页面导航">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeView === "dashboard" && (
        <Dashboard factionSummary={factionSummary} roleSummary={roleSummary} records={matchRecords} />
      )}

      {activeView === "attendance" && (
        <AttendancePanel
          attendance={attendance}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          slot={slot}
        />
      )}

      {activeView === "matches" && <MatchesPanel matches={matchCards} />}

      {activeView === "admin" && <AdminPanel />}
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "green" | "cyan" | "rose" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Dashboard({
  factionSummary,
  roleSummary,
  records,
}: {
  factionSummary: ReturnType<typeof buildFactionSummary>;
  roleSummary: ReturnType<typeof buildRoleSummary>;
  records: MatchRecord[];
}) {
  const players = new Set(records.map((record) => record.playerName)).size;
  const winRate = records.length ? records.filter((record) => record.isWin).length / records.length : 0;

  return (
    <section className="grid two">
      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">阵营胜率</p>
            <h2>当前环境</h2>
          </div>
          <span className="pill">样例数据</span>
        </div>
        <div className="factions">
          {factionSummary.map((item) => {
            const meta = factionMeta[item.faction];
            return (
              <div className="factionRow" key={item.faction}>
                <span className="factionName" style={{ color: meta.color }}>
                  {item.faction}
                </span>
                <div className="barTrack">
                  <div
                    className="barFill"
                    style={{ width: `${item.rate * 100}%`, background: meta.color }}
                  />
                </div>
                <strong>{formatPct(item.rate)}</strong>
                <small>{item.wins}/{item.matches}</small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">个人概览</p>
            <h2>玩家池</h2>
          </div>
        </div>
        <div className="statGrid">
          <Metric label="玩家数" value={players.toString()} tone="cyan" />
          <Metric label="记录数" value={records.length.toString()} tone="green" />
          <Metric label="胜者占比" value={formatPct(winRate)} tone="rose" />
        </div>
      </div>

      <div className="panel wide">
        <div className="panelHead">
          <div>
            <p className="kicker">职业胜率榜</p>
            <h2>Top Roles</h2>
          </div>
        </div>
        <div className="roleList">
          {roleSummary.slice(0, 8).map((item, index) => (
            <div className="roleRow" key={item.role}>
              <span className="rank">{index + 1}</span>
              <strong>{item.role}</strong>
              <div className="barTrack">
                <div className="barFill" style={{ width: `${item.rate * 100}%` }} />
              </div>
              <span>{formatPct(item.rate)}</span>
              <small>{item.wins}/{item.plays}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AttendancePanel({
  attendance,
  selectedSlot,
  setSelectedSlot,
  slot,
}: {
  attendance: ReturnType<typeof buildAttendance>;
  selectedSlot: string;
  setSelectedSlot: (slot: string) => void;
  slot: ReturnType<typeof buildAttendance>[number];
}) {
  const max = Math.max(...attendance.map((item) => item.count), 1);

  return (
    <section className="grid two">
      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">实时大盘</p>
            <h2>半小时在线人数</h2>
          </div>
          <span className="liveDot">Live</span>
        </div>
        <div className="timeline">
          {attendance.map((item) => (
            <button
              key={item.slot}
              className={selectedSlot === item.slot ? "timeBar active" : "timeBar"}
              onClick={() => setSelectedSlot(item.slot)}
              type="button"
            >
              <span>{item.slot}</span>
              <div>
                <i style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">查岗</p>
            <h2>{slot.slot}</h2>
          </div>
        </div>
        <div className="playerCloud">
          {slot.players.map((player) => (
            <span key={player}>{player}</span>
          ))}
        </div>
        <form className="joinForm">
          <input placeholder="群昵称" />
          <select defaultValue="20:30">
            {timeNodes.map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
          <select defaultValue="24:00">
            {timeNodes.map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
          <button type="button">确认发车</button>
        </form>
      </div>
    </section>
  );
}

function MatchesPanel({ matches }: { matches: ReturnType<typeof buildMatchCards> }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.matchId || "");
  const selected = matches.find((match) => match.matchId === selectedMatchId) || matches[0];

  return (
    <section className="grid two">
      <div className="panel matchList">
        <div className="panelHead">
          <div>
            <p className="kicker">全部对局</p>
            <h2>{matches.length} 场</h2>
          </div>
        </div>
        {matches.map((match) => (
          <button
            key={match.matchId}
            className={selected?.matchId === match.matchId ? "matchCard active" : "matchCard"}
            onClick={() => setSelectedMatchId(match.matchId)}
            type="button"
          >
            <span>{match.date}</span>
            <strong>{match.factions} 胜</strong>
            <small>{match.players} 人 · {match.winners}</small>
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">对局明细</p>
            <h2>{selected?.date}</h2>
          </div>
          <span className="pill">{selected?.players} 人</span>
        </div>
        <div className="recordTable">
          {selected?.rows.map((row) => {
            const meta = factionMeta[row.faction];
            return (
              <div className="recordRow" key={row.id}>
                <span className="result">{row.isWin ? "WIN" : "LOSE"}</span>
                <strong>{row.playerName}</strong>
                <span style={{ color: meta.color }}>{row.faction}</span>
                <span>{row.role}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AdminPanel() {
  return (
    <section className="grid two">
      <div className="panel uploadPanel">
        <div className="panelHead">
          <div>
            <p className="kicker">截图识别</p>
            <h2>战绩入库</h2>
          </div>
          <span className="pill">DashScope</span>
        </div>
        <label className="dropZone">
          <input type="file" accept="image/png,image/jpeg" multiple />
          <span>上传结算截图</span>
        </label>
        <button className="primaryButton" type="button">开始识别</button>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">免费部署边界</p>
            <h2>Vercel Ready</h2>
          </div>
        </div>
        <ul className="deployList">
          <li>页面和轻量 API 放 Vercel Hobby。</li>
          <li>战绩数据继续放 Turso 免费层。</li>
          <li>截图建议入 Turso blob/base64 或对象存储。</li>
          <li>DashScope 识别继续使用你自己的 API Key。</li>
        </ul>
      </div>
    </section>
  );
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
