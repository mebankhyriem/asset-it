import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

// Distinct asset_type values actually in use on real assets — includes anything typed in
// via "Other" on Add/Edit Asset that isn't one of the hardcoded ASSET_TYPES presets. Lets
// AssetTypeSelect catch near-duplicates (different casing/spacing of an existing type)
// instead of letting them fragment into two visually-different-but-same categories.
export async function GET() {
  await verifySession();
  const db = getDb();
  const rows = await db.prepare("SELECT DISTINCT asset_type FROM assets WHERE asset_type != '' ORDER BY asset_type").all() as { asset_type: string }[];
  return Response.json({ types: rows.map((r) => r.asset_type) });
}
