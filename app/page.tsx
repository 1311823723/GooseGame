import HomeClient from "./home-client";
import { fetchMatchRecords } from "@/lib/turso-match-records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const { records, error } = await fetchMatchRecords();

  return <HomeClient records={records} error={error} />;
}
