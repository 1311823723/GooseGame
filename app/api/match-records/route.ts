import { NextResponse } from "next/server";
import { fetchMatchRecords } from "@/lib/turso-match-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || undefined;
  const { records, error } = await fetchMatchRecords(date);

  if (error) {
    return NextResponse.json({ records: [], error }, { status: 500 });
  }

  return NextResponse.json({ records });
}
