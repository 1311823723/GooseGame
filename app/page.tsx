import HomeClient from "./home-client";
import { fetchMatchDates, fetchMatchRecords } from "@/lib/turso-match-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const dateResult = await fetchMatchDates();
  const selectedDate = dateResult.latestDate || "全部";
  const { records, error } = dateResult.error
    ? { records: [], error: dateResult.error }
    : await fetchMatchRecords(selectedDate);

  return (
    <HomeClient
      records={records}
      dates={dateResult.dates}
      initialDate={selectedDate}
      error={error}
    />
  );
}
