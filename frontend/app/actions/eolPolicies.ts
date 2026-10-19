"use server";

import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function upsertEolPolicy(_state: { error: string } | { success: boolean } | undefined, formData: FormData) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  const asset_type = (formData.get("asset_type") as string)?.trim();
  const lifespan_years = parseInt(formData.get("lifespan_years") as string) || 0;
  if (!asset_type) return { error: "Asset type is required" };
  if (lifespan_years <= 0) return { error: "Lifespan must be a positive integer" };

  const db = getDb();
  const existing = await db.prepare("SELECT id FROM eol_policies WHERE asset_type = ?").get(asset_type) as any;
  if (existing) {
    await db.prepare("UPDATE eol_policies SET lifespan_years = ?, updated_at = NOW() WHERE id = ?").run(lifespan_years, existing.id);
  } else {
    await db.prepare("INSERT INTO eol_policies (asset_type, lifespan_years, created_by) VALUES (?, ?, ?)").run(asset_type, lifespan_years, userId);
  }

  return { success: true };
}

export async function deleteEolPolicy(id: number) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };
  const db = getDb();
  await db.prepare("DELETE FROM eol_policies WHERE id = ?").run(id);
  return { success: true };
}

export async function listEolPolicies() {
  const db = getDb();
  return await db.prepare("SELECT * FROM eol_policies ORDER BY asset_type").all();
}
