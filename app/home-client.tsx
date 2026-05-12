"use client";

import { useMemo, useState } from "react";
import type { MatchRecord } from "@/lib/sample-data";
import {
  buildFactionSummary,
  buildMatchCards,
  buildRoleSummary,
  factionMeta,
} from "@/lib/stats";

type View = "dashboard" | "attendance" | "matches" | "admin";

type HomeClientProps = {
  records: MatchRecord[];
  error: string | null;
};

const navItems: { id: View; label: string }[] = [
  { id: "dashboard", label: "数据大厅" },
  { id: "attendance", label: "发车" },
  { id: "matches", label: "对局" },
  { id: "admin", label: "入库" },
];

export default function HomeClient({ records, error }: HomeClientProps) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const matchCards = useMemo(() => buildMatchCards(records), [records]);
  const playerCount = useMemo(() => new Set(records.map((record) => record.playerName)).size, [records]);
  const matchCount = useMemo(() => new Set(records.map((record) => record.matchId)).size, [records]);

  return (
    <main className="shell">
      <header className="topBar">
        <div className="brandMark" aria-hidden="true">G</div>
        <div>
          <strong>GooseGame Lab</strong>
          <span>对局数据与发车管理</span>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">GooseGame</p>
          <h1>鹅鸭杀发车助手</h1>
          <p className="heroCopy">今晚人数、战绩胜率、每局身份，一屏拉齐。</p>
        </div>
        <div className="heroStats" aria-label="核心数据">
          <Metric label="活跃玩家" value={playerCount.toString()} tone="green" />
          <Metric label="对局数" value={matchCount.toString()} tone="cyan" />
          <Metric label="已入库" value={records.length.toString()} tone="rose" />
        </div>
      </section>

      <nav className="viewNav" aria-label="页面导航">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
            aria-current={activeView === item.id ? "page" : undefined}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? <StatusPanel title="真实数据读取失败" message={error} /> : null}

      {activeView === "dashboard" && <Dashboard records={records} />}
      {activeView === "attendance" && <AttendancePanel />}
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

function StatusPanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="grid two">
      <div className="panel wide">
        <div className="panelHead">
          <div>
            <p className="kicker">数据状态</p>
            <h2>{title}</h2>
          </div>
          <span className="pill">Turso</span>
        </div>
        <p className="emptyState">{message}</p>
      </div>
    </section>
  );
}

function Dashboard({ records }: { records: MatchRecord[] }) {
  const dates = useMemo(
    () => ["全部", ...Array.from(new Set(records.map((record) => record.date))).sort((a, b) => b.localeCompare(a))],
    [records],
  );
  const [selectedDate, setSelectedDate] = useState("全部");
  const activeRecords = useMemo(
    () => records.filter((record) => selectedDate === "全部" || record.date === selectedDate),
    [records, selectedDate],
  );
  const playerOptions = useMemo(
    () => Array.from(new Set(activeRecords.map((record) => record.playerName))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [activeRecords],
  );
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const currentPlayer = playerOptions.includes(selectedPlayer) ? selectedPlayer : playerOptions[0] || "";
  const playerRecords = useMemo(
    () => activeRecords.filter((record) => record.playerName === currentPlayer),
    [activeRecords, currentPlayer],
  );
  const factionSummary = useMemo(() => buildFactionSummary(activeRecords), [activeRecords]);
  const roleSummary = useMemo(() => buildRoleSummary(activeRecords), [activeRecords]);
  const players = new Set(activeRecords.map((record) => record.playerName)).size;
  const winRate = activeRecords.length
    ? activeRecords.filter((record) => record.isWin).length / activeRecords.length
    : 0;
  const matchCount = new Set(activeRecords.map((record) => record.matchId)).size;
  const playerWinRate = playerRecords.length
    ? playerRecords.filter((record) => record.isWin).length / playerRecords.length
    : 0;
  const playerRoleSummary = useMemo(() => buildRoleSummary(playerRecords), [playerRecords]);

  return (
    <section className="grid two">
      <div className="panel wide filterPanel">
        <div className="panelHead compact">
          <div>
            <p className="kicker">筛选器</p>
            <h2>数据大厅查询</h2>
          </div>
          <span className="pill">{selectedDate === "全部" ? "全部数据" : selectedDate}</span>
        </div>
        <div className="filters single">
          <label htmlFor="dashboard-date-filter">
            <span>选择日期</span>
            <select
              id="dashboard-date-filter"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date === "全部" ? "全部日期" : date}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">阵营胜率</p>
            <h2>{selectedDate === "全部" ? "全部日期" : selectedDate}</h2>
          </div>
          <span className="pill">实时数据</span>
        </div>
        <div className="factions">
          {factionSummary.length ? (
            factionSummary.map((item) => {
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
            })
          ) : (
            <p className="emptyState">这个日期还没有战绩数据。</p>
          )}
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
          <Metric label="对局数" value={matchCount.toString()} tone="green" />
          <Metric label="胜者占比" value={formatPct(winRate)} tone="rose" />
        </div>
      </div>

      <div className="panel wide">
        <div className="panelHead">
          <div>
            <p className="kicker">玩家战绩查询</p>
            <h2>{currentPlayer || "暂无玩家"}</h2>
          </div>
          <span className="pill">{selectedDate === "全部" ? "全部日期" : selectedDate}</span>
        </div>
        {currentPlayer ? (
          <div className="playerDetail">
            <label className="playerSelect" htmlFor="dashboard-player-filter">
              <span>选择玩家</span>
              <select
                id="dashboard-player-filter"
                value={currentPlayer}
                onChange={(event) => setSelectedPlayer(event.target.value)}
              >
                {playerOptions.map((player) => (
                  <option key={player} value={player}>
                    {player}
                  </option>
                ))}
              </select>
            </label>
            <div className="playerMetrics">
              <Metric label="参与局数" value={playerRecords.length.toString()} tone="cyan" />
              <Metric
                label="胜场"
                value={playerRecords.filter((record) => record.isWin).length.toString()}
                tone="green"
              />
              <Metric label="胜率" value={formatPct(playerWinRate)} tone="rose" />
            </div>
            <div className="playerBreakdown">
              <div>
                <p className="miniTitle">常用职业</p>
                <div className="compactRows">
                  {playerRoleSummary.length ? (
                    playerRoleSummary.map((item) => (
                      <div className="compactRow" key={item.role}>
                        <strong>{item.role}</strong>
                        <span>{item.wins}/{item.plays}</span>
                        <span>{formatPct(item.rate)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="emptyState">当前还没有职业数据。</p>
                  )}
                </div>
              </div>
              <div>
                <p className="miniTitle">战绩明细</p>
                <div className="compactRows">
                  {playerRecords.map((record) => (
                    <div className="compactRow" key={record.id}>
                      <strong>{record.date}</strong>
                      <span>{record.faction} · {record.role}</span>
                      <span className={record.isWin ? "winText" : "loseText"}>
                        {record.isWin ? "WIN" : "LOSE"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="emptyState">当前日期范围内还没有玩家战绩。</p>
        )}
      </div>

      <div className="panel wide">
        <div className="panelHead">
          <div>
            <p className="kicker">职业胜率榜</p>
            <h2>Top Roles</h2>
          </div>
        </div>
        <div className="roleList">
          {roleSummary.length ? (
            roleSummary.slice(0, 8).map((item, index) => (
              <div className="roleRow" key={item.role}>
                <span className="rank">{index + 1}</span>
                <strong>{item.role}</strong>
                <div className="barTrack">
                  <div className="barFill" style={{ width: `${item.rate * 100}%` }} />
                </div>
                <span>{formatPct(item.rate)}</span>
                <small>{item.wins}/{item.plays}</small>
              </div>
            ))
          ) : (
            <p className="emptyState">当前还没有职业胜率数据。</p>
          )}
        </div>
      </div>
    </section>
  );
}

function AttendancePanel() {
  return (
    <section className="grid two">
      <div className="panel wide">
        <div className="panelHead">
          <div>
            <p className="kicker">发车数据</p>
            <h2>暂未接入真实数据</h2>
          </div>
          <span className="pill">未接入</span>
        </div>
        <p className="emptyState">发车数据目前仍由旧版 Streamlit 流程管理，Next.js 页面暂未接入这部分真实数据。</p>
      </div>
    </section>
  );
}

function MatchesPanel({ matches }: { matches: ReturnType<typeof buildMatchCards> }) {
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.matchId || "");
  const selected = matches.find((match) => match.matchId === selectedMatchId) || matches[0];

  if (!matches.length) {
    return (
      <section className="grid two">
        <div className="panel wide">
          <div className="panelHead">
            <div>
              <p className="kicker">全部对局</p>
              <h2>暂无数据</h2>
            </div>
            <span className="pill">实时数据</span>
          </div>
          <p className="emptyState">当前还没有可展示的对局记录。</p>
        </div>
      </section>
    );
  }

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
          <small>支持 PNG / JPG，多张截图可一次选择</small>
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
