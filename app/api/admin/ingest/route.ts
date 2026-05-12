import { NextResponse } from "next/server";
import { applyRoleMappingToRecords } from "@/lib/role-mapping";
import { sanitizeEditableRows } from "@/lib/match-record-shared";
import { executeTurso, parseText, tursoBlob } from "@/lib/turso-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PendingImage = {
  matchId?: unknown;
  dataUrl?: unknown;
};

function imageBase64(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { rows?: unknown; images?: unknown; applyMapping?: unknown } | null;
  const rows = sanitizeEditableRows(body?.rows);

  if (!rows?.length) {
    return NextResponse.json({ error: "没有可入库的预览数据。" }, { status: 400 });
  }

  const finalRows = body?.applyMapping === false ? rows : applyRoleMappingToRecords(rows);
  const imageItems = Array.isArray(body?.images) ? body.images as PendingImage[] : [];
  const imageByMatchId = new Map<string, string>();
  imageItems.forEach((image) => {
    const matchId = parseText(image.matchId);
    const dataUrl = parseText(image.dataUrl);
    if (matchId && dataUrl) {
      imageByMatchId.set(matchId, imageBase64(dataUrl));
    }
  });

  const statements = [
    ...finalRows.map((row) => ({
      sql: "insert into match_records (match_id, date, player_name, faction, role, is_win) values (?, ?, ?, ?, ?, ?)",
      args: [row.matchId, row.date, row.playerName, row.faction, row.role, row.isWin ? 1 : 0],
    })),
    ...Array.from(imageByMatchId.entries()).map(([matchId, base64]) => ({
      sql: "insert or replace into match_images (match_id, image) values (?, ?)",
      args: [matchId, tursoBlob(base64)],
    })),
  ];

  const { error } = await executeTurso(statements);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({
    insertedRows: finalRows.length,
    insertedImages: imageByMatchId.size,
  });
}
