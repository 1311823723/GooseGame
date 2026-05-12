import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { allowedFactions, EditableRecord } from "@/lib/match-record-shared";
import { applyRoleMappingToRecords } from "@/lib/role-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const visionPrompt = (
  "这是一张《鹅鸭杀》游戏结算截图。画面正中间下方是获胜玩家，上方一排是输掉的其他玩家。" +
  "请结合鹅鸭杀游戏规则推断每个职业所属的阵营（鹅/鸭/中立），严格以 json 数组格式输出所有玩家信息。" +
  "字段必须为：player_name(字符串), faction(字符串:鹅/鸭/中立), role(字符串:具体职业), is_win(布尔值:画面下方的获胜者为true，上方玩家为false)。" +
  "所有的 json key 必须小写。只输出纯 json 数组，禁止输出 markdown 代码块或任何多余文字。" +
  "\n职业名称必须从以下列表中选择，不允许使用其他名称：" +
  "\n鹅阵营：工程师, 侦探, 观鸟者, 锁匠, 保镖, 殡仪员, 通灵者, 冒险家, 加拿大鹅, 正义使者, 网红, 肉汁, 模仿鹅, 星界行者, 政治家, 复仇者, 警长, 说客, 跟踪者, 探测员, 验尸官, 清醒梦者, 科学家, 士兵, 生存主义者, 模仿者, 预言家, 恋人[鹅]" +
  "\n鸭阵营：刺客, 专业杀手, 连环杀手, 雇佣杀手, 爆炸王, 身份窃贼, 告密者, 间谍, 派对鸭, 静语者, 丧葬者, 食鸟鸭, 变形者, 忍者, 隐形者, 寄生者, 走失小鸭, 巫医, 狙击手, 宿主, 恋人[鸭]" +
  "\n中立阵营：渡鸦, 布谷鸟, 呆呆鸟, 决斗呆呆鸟, 秃鹫, 鸽子, 猎鹰, 鹈鹕"
);

type RecognitionRecord = {
  player_name?: unknown;
  faction?: unknown;
  role?: unknown;
  is_win?: unknown;
};

function mediaType(file: File) {
  if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
    return "image/png";
  }
  return "image/jpeg";
}

function extractJson(text: string) {
  let output = text.trim();
  while (output.startsWith("```")) {
    const newlineIndex = output.indexOf("\n");
    output = newlineIndex === -1 ? output.slice(3) : output.slice(newlineIndex + 1);
  }
  if (output.endsWith("```")) {
    output = output.slice(0, -3);
  }
  return output.trim();
}

function normalizeRecord(record: RecognitionRecord, matchId: string, matchDate: string, id: number): EditableRecord {
  const playerName = String(record.player_name ?? "").trim();
  const faction = String(record.faction ?? "").trim();
  const role = String(record.role ?? "").trim();
  const isWin = record.is_win;

  if (!playerName || !role) {
    throw new Error("识别结果包含空玩家或空职业。");
  }

  if (!allowedFactions.includes(faction as EditableRecord["faction"])) {
    throw new Error(`识别结果包含非法阵营：${faction}`);
  }

  if (typeof isWin !== "boolean") {
    throw new Error("识别结果中的 is_win 必须是布尔值。");
  }

  return {
    id,
    matchId,
    date: matchDate,
    playerName,
    faction: faction as EditableRecord["faction"],
    role,
    isWin,
  };
}

async function recognizeFile(file: File, matchDate: string, rowStart: number) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("未配置 DASHSCOPE_API_KEY。");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageBase64 = bytes.toString("base64");
  const imageDataUrl = `data:${mediaType(file)};base64,${imageBase64}`;
  const matchId = `${matchDate}-${randomUUID().replaceAll("-", "").slice(0, 12)}`;

  const response = await fetch(DASHSCOPE_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen3-vl-235b-a22b-thinking",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: visionPrompt },
          ],
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${file.name} 识别失败（HTTP ${response.status}）。`);
  }

  const body = await response.json();
  const content = String(body?.choices?.[0]?.message?.content ?? "");
  const parsed = JSON.parse(extractJson(content)) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${file.name} 识别结果不是 JSON 数组。`);
  }

  const rows = parsed.map((item, index) => normalizeRecord(item as RecognitionRecord, matchId, matchDate, rowStart - index));
  return {
    image: { matchId, dataUrl: imageDataUrl, fileName: file.name },
    rows: applyRoleMappingToRecords(rows),
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const matchDate = String(formData.get("date") ?? "").trim();
  const files = formData.getAll("images").filter((item): item is File => item instanceof File);

  if (!matchDate) {
    return NextResponse.json({ error: "请先选择对局日期。" }, { status: 400 });
  }

  if (!files.length) {
    return NextResponse.json({ error: "请先上传至少一张截图。" }, { status: 400 });
  }

  const rows: EditableRecord[] = [];
  const images: Array<{ matchId: string; dataUrl: string; fileName: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const result = await recognizeFile(file, matchDate, -(rows.length + 1));
      rows.push(...result.rows);
      images.push(result.image);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name} 识别失败。`);
    }
  }

  return NextResponse.json({ rows, images, errors });
}
