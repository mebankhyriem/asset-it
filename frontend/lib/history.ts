import "server-only";
import { getDb } from "@/lib/db/client";

export async function recordAssetEvent(
  assetDbId: number,
  event: string,
  actorId: number | null,
  notes?: string
) {
  const db = getDb();
  let actorName: string | null = null;
  let actorRole: string | null = null;

  if (actorId) {
    const actor = await db.prepare("SELECT name, role FROM users WHERE id = ?").get(actorId) as any;
    actorName = actor?.name ?? null;
    actorRole = actor?.role ?? null;
  }

  await db.prepare(`
    INSERT INTO asset_history (asset_id, event, actor_name, actor_role, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(assetDbId, event, actorName, actorRole, notes ?? null);
}
