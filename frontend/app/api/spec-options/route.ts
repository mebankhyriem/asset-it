import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/dal";

// Values IMs have typed in via "Other" on the Add Asset specs prompt, previously saved
// by createAsset — merged client-side with the hardcoded presets in lib/types.ts so the
// pick list only ever grows.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "INVENTORY_MANAGER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const db = getDb();
  const rows = await db.prepare("SELECT kind, value FROM spec_options ORDER BY value ASC").all() as { kind: string; value: string }[];
  return NextResponse.json({
    os: rows.filter((r) => r.kind === "os").map((r) => r.value),
    ram: rows.filter((r) => r.kind === "ram").map((r) => r.value),
    processor: rows.filter((r) => r.kind === "processor").map((r) => r.value),
  });
}
