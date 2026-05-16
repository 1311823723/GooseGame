"use client";

import { useEffect, useMemo, useState } from "react";
import type { Faction, MatchRecord } from "@/lib/sample-data";
import {
  buildFactionSummary,
  buildMatchCards,
  buildRoleSummary,
  factionMeta,
} from "@/lib/stats";
import { Badge, Button, Card, EmptyState, Field, SectionHeader } from "./ui-primitives";

type View = "dashboard" | "attendance" | "matches" | "admin";

type HomeClientProps = {
  records: MatchRecord[];
  dates: string[];
  initialDate: string;
  error: string | null;
};

type EditableRow = Pick<MatchRecord, "id" | "matchId" | "date" | "playerName" | "faction" | "role" | "isWin">;

type AdminMatch = {
  matchId: string;
  date: string;
  players: number;
  imageDataUrl?: string;
  rows: EditableRow[];
};

type MatchSummary = Pick<AdminMatch, "matchId" | "date" | "players"> & {
  hasImage: boolean;
};

type PendingImage = {
  matchId: string;
  dataUrl: string;
  fileName: string;
};

const navItems: { id: View; label: string }[] = [
  { id: "dashboard", label: "数据大厅" },
  { id: "attendance", label: "发车" },
  { id: "matches", label: "对局" },
  { id: "admin", label: "入库" },
];

export default function HomeClient({ records, dates, initialDate, error }: HomeClientProps) {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [loadedRecords, setLoadedRecords] = useState(records);
  const [selectedDataDate, setSelectedDataDate] = useState(initialDate);
  const [dataError, setDataError] = useState(error);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const dateOptions = useMemo(() => ["全部", ...dates], [dates]);
  const matchCards = useMemo(() => buildMatchCards(loadedRecords), [loadedRecords]);
  const playerCount = useMemo(() => new Set(loadedRecords.map((record) => record.playerName)).size, [loadedRecords]);
  const matchCount = useMemo(() => new Set(loadedRecords.map((record) => record.matchId)).size, [loadedRecords]);

  async function loadRecordsForDate(date: string) {
    setSelectedDataDate(date);
    setLoadingRecords(true);
    setDataError(null);
    try {
      const response = await fetch(`/api/match-records?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "读取战绩数据失败。");
      }
      setLoadedRecords(body.records as MatchRecord[]);
    } catch (fetchError) {
      setDataError(fetchError instanceof Error ? fetchError.message : "读取战绩数据失败。");
      setLoadedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }

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

      {dataError ? <StatusPanel title="真实数据读取失败" message={dataError} /> : null}
      {loadingRecords ? <StatusPanel title="正在切换数据" message="正在按所选日期读取战绩与截图。" /> : null}

      {activeView === "dashboard" && (
        <Dashboard
          records={loadedRecords}
          dates={dateOptions}
          selectedDate={selectedDataDate}
          onDateChange={loadRecordsForDate}
          loading={loadingRecords}
        />
      )}
      {activeView === "attendance" && <AttendancePanel />}
      {activeView === "matches" && (
        <MatchesPanel
          matches={matchCards}
          dates={dateOptions}
          selectedDate={selectedDataDate}
          onDateChange={loadRecordsForDate}
          loading={loadingRecords}
        />
      )}
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
      <Card className="wide">
        <SectionHeader eyebrow="数据状态" title={title} action={<Badge>Turso</Badge>} />
        <EmptyState>{message}</EmptyState>
      </Card>
    </section>
  );
}

function Dashboard({
  records,
  dates,
  selectedDate,
  onDateChange,
  loading,
}: {
  records: MatchRecord[];
  dates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  loading: boolean;
}) {
  const playerOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.playerName))).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [records],
  );
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const currentPlayer = playerOptions.includes(selectedPlayer) ? selectedPlayer : playerOptions[0] || "";
  const playerRecords = useMemo(
    () => records.filter((record) => record.playerName === currentPlayer),
    [records, currentPlayer],
  );
  const factionSummary = useMemo(() => buildFactionSummary(records), [records]);
  const roleSummary = useMemo(() => buildRoleSummary(records), [records]);
  const players = new Set(records.map((record) => record.playerName)).size;
  const winRate = records.length
    ? records.filter((record) => record.isWin).length / records.length
    : 0;
  const matchCount = new Set(records.map((record) => record.matchId)).size;
  const playerWinRate = playerRecords.length
    ? playerRecords.filter((record) => record.isWin).length / playerRecords.length
    : 0;
  const playerRoleSummary = useMemo(() => buildRoleSummary(playerRecords), [playerRecords]);

  return (
    <section className="grid two">
      <Card className="wide filterPanel">
        <SectionHeader
          eyebrow="筛选器"
          title="数据大厅查询"
          action={<Badge>{selectedDate === "全部" ? "全部数据" : selectedDate}</Badge>}
          compact
        />
        <div className="filters single">
          <Field label="选择日期" htmlFor="dashboard-date-filter">
            <select
              id="dashboard-date-filter"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              disabled={loading}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {date === "全部" ? "全部日期" : date}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="阵营胜率"
          title={selectedDate === "全部" ? "全部日期" : selectedDate}
          action={<Badge>实时数据</Badge>}
        />
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
            <EmptyState>这个日期还没有战绩数据。</EmptyState>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="个人概览" title="玩家池" />
        <div className="statGrid">
          <Metric label="玩家数" value={players.toString()} tone="cyan" />
          <Metric label="对局数" value={matchCount.toString()} tone="green" />
          <Metric label="胜者占比" value={formatPct(winRate)} tone="rose" />
        </div>
      </Card>

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

function MatchesPanel({
  matches,
  dates,
  selectedDate,
  onDateChange,
  loading,
}: {
  matches: ReturnType<typeof buildMatchCards>;
  dates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  loading: boolean;
}) {
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
      <div className="panel wide filterPanel">
        <div className="panelHead compact">
          <div>
            <p className="kicker">对局筛选</p>
            <h2>按日期查看</h2>
          </div>
          <span className="pill">{selectedDate === "全部" ? `${matches.length} 场` : selectedDate}</span>
        </div>
        <div className="filters single">
          <label htmlFor="match-date-filter">
            <span>选择日期</span>
            <select
              id="match-date-filter"
              value={selectedDate}
              onChange={(event) => {
                onDateChange(event.target.value);
                setSelectedMatchId("");
              }}
              disabled={loading}
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

      <div className="panel matchList">
        <div className="panelHead">
          <div>
            <p className="kicker">全部对局</p>
            <h2>{matches.length} 场</h2>
          </div>
        </div>
        {matches.length ? (
          matches.map((match) => (
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
          ))
        ) : (
          <p className="emptyState">这个日期还没有对局记录。</p>
        )}
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">对局明细</p>
            <h2>{selected?.date}</h2>
          </div>
          <span className="pill">{selected?.players} 人</span>
        </div>
        {selected?.imageDataUrl ? (
          <figure className="matchScreenshot">
            <img src={selected.imageDataUrl} alt={`${selected.matchId} 结算截图`} />
          </figure>
        ) : (
          <p className="emptyState screenshotEmpty">这局数据库里还没有截图。</p>
        )}
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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [recognitionDate, setRecognitionDate] = useState(today);
  const [pendingRows, setPendingRows] = useState<EditableRow[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [recognitionErrors, setRecognitionErrors] = useState<string[]>([]);

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [summaries, setSummaries] = useState<MatchSummary[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [selected, setSelected] = useState<AdminMatch | null>(null);
  const [draftRows, setDraftRows] = useState<EditableRow[]>([]);
  const [deletedDraftIds, setDeletedDraftIds] = useState<number[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function resetSelectedMatch() {
    setSelectedMatchId("");
    setSelected(null);
    setDraftRows([]);
    setDeletedDraftIds([]);
  }

  async function loadDates() {
    setLoadingDates(true);
    setError("");
    try {
      const response = await fetch("/api/admin/matches?mode=dates", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "日期读取失败。");
      }
      const nextDates = body.dates as string[];
      setDates(nextDates);
      setSelectedDate((current) => current || nextDates[0] || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "日期读取失败。");
    } finally {
      setLoadingDates(false);
    }
  }

  async function loadSummaries(date: string) {
    if (!date) {
      setSummaries([]);
      resetSelectedMatch();
      return;
    }
    setLoadingSummaries(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/matches?mode=summaries&date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "对局列表读取失败。");
      }
      const nextSummaries = body.matches as MatchSummary[];
      setSummaries(nextSummaries);
      resetSelectedMatch();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "对局列表读取失败。");
    } finally {
      setLoadingSummaries(false);
    }
  }

  async function loadMatch(matchId: string) {
    if (!matchId) {
      resetSelectedMatch();
      return;
    }
    setLoadingMatch(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/matches?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "对局读取失败。");
      }
      const nextMatch = body.match as AdminMatch | null;
      setSelected(nextMatch);
      setDraftRows(nextMatch?.rows ?? []);
      setDeletedDraftIds([]);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "对局读取失败。");
    } finally {
      setLoadingMatch(false);
    }
  }

  useEffect(() => {
    void loadDates();
  }, []);

  useEffect(() => {
    void loadSummaries(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    void loadMatch(selectedMatchId);
  }, [selectedMatchId]);

  function updateRows(setter: (updater: (rows: EditableRow[]) => EditableRow[]) => void, id: number, field: keyof EditableRow, value: string | boolean) {
    setter((rows) =>
      rows.map((row) => (
        row.id === id
          ? { ...row, [field]: field === "isWin" ? Boolean(value) : value }
          : row
      )),
    );
  }

  function removeRows(setter: (updater: (rows: EditableRow[]) => EditableRow[]) => void, id: number, trackDeleted = false) {
    if (trackDeleted && id > 0) {
      setDeletedDraftIds((ids) => [...new Set([...ids, id])]);
    }
    setter((rows) => rows.filter((row) => row.id !== id));
  }

  function addDraftRow() {
    const template = draftRows[0] || selected?.rows[0];
    const nextId = Math.min(0, ...draftRows.map((row) => row.id)) - 1;
    setDraftRows((rows) => [
      ...rows,
      {
        id: nextId,
        matchId: selected?.matchId || selectedMatchId,
        date: template?.date || selectedDate,
        playerName: "",
        faction: "鹅",
        role: "",
        isWin: false,
      },
    ]);
  }

  async function recognizeUploads() {
    if (!uploadFiles.length) {
      setError("请先上传至少一张截图。");
      return;
    }
    setRecognizing(true);
    setError("");
    setStatus("");
    setRecognitionErrors([]);
    const formData = new FormData();
    formData.set("date", recognitionDate);
    uploadFiles.forEach((file) => formData.append("images", file));
    try {
      const response = await fetch("/api/admin/recognize", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "识别失败。");
      }
      setPendingRows(body.rows as EditableRow[]);
      setPendingImages(body.images as PendingImage[]);
      setRecognitionErrors(body.errors ?? []);
      setStatus(`识别完成，得到 ${(body.rows as EditableRow[]).length} 条预览记录。请检查后再确认入库。`);
    } catch (recognizeError) {
      setError(recognizeError instanceof Error ? recognizeError.message : "识别失败。");
    } finally {
      setRecognizing(false);
    }
  }

  async function confirmIngest() {
    if (!pendingRows.length) {
      setError("当前没有可入库的预览数据。");
      return;
    }
    setIngesting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pendingRows, images: pendingImages, applyMapping: true }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "入库失败。");
      }
      setStatus(`已写入 ${body.insertedRows ?? 0} 条记录，保存 ${body.insertedImages ?? 0} 张截图。`);
      setPendingRows([]);
      setPendingImages([]);
      setUploadFiles([]);
      await loadDates();
    } catch (ingestError) {
      setError(ingestError instanceof Error ? ingestError.message : "入库失败。");
    } finally {
      setIngesting(false);
    }
  }

  async function saveSelectedMatch() {
    if (!selected) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: selected.matchId, rows: draftRows, deletedIds: deletedDraftIds }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "提交失败。");
      }
      if (body.match) {
        const nextMatch = body.match as AdminMatch;
        setSelected(nextMatch);
        setDraftRows(nextMatch.rows);
        setDeletedDraftIds([]);
      }
      setStatus(`${selected.matchId} 已提交。`);
      await loadSummaries(selectedDate);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败。");
    } finally {
      setSaving(false);
    }
  }

  async function applyMapping(scope: "date" | "match") {
    const matchId = scope === "match" ? selected?.matchId : "";
    if (scope === "match" && !matchId) {
      setError("请先选择对局。");
      return;
    }
    if (scope === "date" && !selectedDate) {
      setError("请先选择日期。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-mapping", matchId, date: selectedDate }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "映射失败。");
      }
      if (scope === "match" && body.match) {
        const nextMatch = body.match as AdminMatch;
        setSelected(nextMatch);
        setDraftRows(nextMatch.rows);
      }
      setStatus(scope === "match" ? `${matchId} 已按映射表修正。` : `${selectedDate} 已按映射表修正 ${body.changedRows ?? 0} 行。`);
      await loadSummaries(selectedDate);
    } catch (mappingError) {
      setError(mappingError instanceof Error ? mappingError.message : "映射失败。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid two">
      <div className="panel uploadPanel">
        <div className="panelHead">
          <div>
            <p className="kicker">截图识别</p>
            <h2>战绩入库</h2>
          </div>
          <span className="pill">二级确认</span>
        </div>
        <label className="playerSelect" htmlFor="recognition-date">
          <span>对局日期</span>
          <input id="recognition-date" type="date" value={recognitionDate} onChange={(event) => setRecognitionDate(event.target.value)} />
        </label>
        <label className="dropZone">
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={(event) => setUploadFiles(Array.from(event.target.files ?? []))}
          />
          <span>{uploadFiles.length ? `已选择 ${uploadFiles.length} 张截图` : "上传结算截图"}</span>
          <small>识别后先进入预览表格，确认后才会落库</small>
        </label>
        <Button variant="primary" onClick={recognizeUploads} disabled={recognizing || ingesting}>
          {recognizing ? "识别中..." : "开始识别"}
        </Button>
      </div>

      <div className="panel">
        <div className="panelHead">
          <div>
            <p className="kicker">入库流程</p>
            <h2>Preview First</h2>
          </div>
        </div>
        <ul className="deployList">
          <li>截图识别只生成预览数据，不会直接写库。</li>
          <li>预览表格可修改玩家、阵营、职业和胜负。</li>
          <li>确认入库时会同时保存对局记录和截图。</li>
          <li>入库前默认再跑一次映射表修正。</li>
        </ul>
      </div>

      <div className="panel wide databasePanel">
        <div className="panelHead">
          <div>
            <p className="kicker">识别预览</p>
            <h2>确认后落库</h2>
          </div>
          <Button variant="primary" compact onClick={confirmIngest} disabled={ingesting || recognizing || !pendingRows.length}>
            {ingesting ? "入库中..." : "确认入库"}
          </Button>
        </div>
        {recognitionErrors.length ? (
          <div className="compactRows">
            {recognitionErrors.map((message) => <EmptyState tone="error" key={message}>{message}</EmptyState>)}
          </div>
        ) : null}
        {pendingImages.length ? (
          <div className="previewImages">
            {pendingImages.map((image) => (
              <figure className="matchScreenshot" key={image.matchId}>
                <img src={image.dataUrl} alt={`${image.fileName} 识别预览`} />
                <figcaption>{image.fileName}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        {pendingRows.length ? (
          <EditableRows
            rows={pendingRows}
            onChange={(id, field, value) => updateRows(setPendingRows, id, field, value)}
            onRemove={(id) => removeRows(setPendingRows, id)}
          />
        ) : (
          <EmptyState>上传截图并识别后，会在这里显示可编辑预览表格。</EmptyState>
        )}
      </div>

      <div className="panel wide databasePanel">
        <div className="panelHead">
          <div>
            <p className="kicker">数据库管理</p>
            <h2>按日期选择后修改</h2>
          </div>
          <div className="actionGroup">
            <Button onClick={loadDates} disabled={loadingDates || saving}>
              刷新日期
            </Button>
            <Button onClick={() => applyMapping("date")} disabled={saving || !selectedDate}>
              映射当前日期
            </Button>
          </div>
        </div>
        {error ? <EmptyState tone="error">{error}</EmptyState> : null}
        {status ? <EmptyState tone="success">{status}</EmptyState> : null}
        <div className="filters twoControls">
          <label htmlFor="admin-date-filter">
            <span>选择日期</span>
            <select id="admin-date-filter" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} disabled={loadingDates}>
              <option value="">{loadingDates ? "读取中..." : "请选择日期"}</option>
              {dates.map((date) => <option key={date} value={date}>{date}</option>)}
            </select>
          </label>
          <label htmlFor="admin-match-filter">
            <span>选择对局</span>
            <select id="admin-match-filter" value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)} disabled={!selectedDate || loadingSummaries}>
              <option value="">{loadingSummaries ? "读取中..." : "请选择对局"}</option>
              {summaries.map((match) => (
                <option key={match.matchId} value={match.matchId}>
                  {match.matchId} · {match.players} 行 · {match.hasImage ? "有截图" : "无截图"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loadingMatch ? (
          <p className="emptyState">正在加载所选对局...</p>
        ) : selected ? (
          <div className="adminEditor">
            <div className="editorToolbar">
              <div>
                <p className="miniTitle">当前对局</p>
                <strong>{selected.matchId}</strong>
              </div>
              <div className="actionGroup">
                <Button onClick={addDraftRow} disabled={saving}>
                  新增行
                </Button>
                <Button onClick={() => applyMapping("match")} disabled={saving}>
                  映射本局
                </Button>
                <Button variant="primary" compact onClick={saveSelectedMatch} disabled={saving}>
                  {saving ? "提交中..." : "提交修改"}
                </Button>
              </div>
            </div>
            {selected.imageDataUrl ? (
              <figure className="matchScreenshot adminScreenshot">
                <img src={selected.imageDataUrl} alt={`${selected.matchId} 数据库截图`} />
              </figure>
            ) : (
              <EmptyState>这局没有存放截图。</EmptyState>
            )}
            <EditableRows
              rows={draftRows}
              onChange={(id, field, value) => updateRows(setDraftRows, id, field, value)}
              onRemove={(id) => removeRows(setDraftRows, id, true)}
            />
          </div>
        ) : (
          <EmptyState>先选择日期，再选择对局，系统才会加载该局明细。</EmptyState>
        )}
      </div>
    </section>
  );
}

function EditableRows({
  rows,
  onChange,
  onRemove,
}: {
  rows: EditableRow[];
  onChange: (id: number, field: keyof EditableRow, value: string | boolean) => void;
  onRemove?: (id: number) => void;
}) {
  return (
    <div className="adminRows">
      {rows.map((row) => (
        <div className="adminRow" key={row.id}>
          <span className="rowId">{row.id > 0 ? `#${row.id}` : "新"}</span>
          <label>
            <span>日期</span>
            <input value={row.date} onChange={(event) => onChange(row.id, "date", event.target.value)} />
          </label>
          <label>
            <span>玩家</span>
            <input value={row.playerName} onChange={(event) => onChange(row.id, "playerName", event.target.value)} />
          </label>
          <label>
            <span>阵营</span>
            <select value={row.faction} onChange={(event) => onChange(row.id, "faction", event.target.value as Faction)}>
              <option value="鹅">鹅</option>
              <option value="鸭">鸭</option>
              <option value="中立">中立</option>
            </select>
          </label>
          <label>
            <span>职业</span>
            <input value={row.role} onChange={(event) => onChange(row.id, "role", event.target.value)} />
          </label>
          <label className="winToggle">
            <span>胜利</span>
            <input type="checkbox" checked={row.isWin} onChange={(event) => onChange(row.id, "isWin", event.target.checked)} />
          </label>
          {onRemove ? (
            <button className="dangerButton" type="button" onClick={() => onRemove(row.id)}>
              删除
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
