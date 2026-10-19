"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { withTransaction } from "@/lib/db/transaction";
import { getDb } from "@/lib/db/client";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function logMaintenance(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();

  const asset_id = parseInt(formData.get("asset_id") as string);
  const maintenance_type = formData.get("maintenance_type") as string;
  const description = (formData.get("description") as string)?.trim();
  const vendor_name = (formData.get("vendor_name") as string)?.trim() || null;
  const vendor_contact = (formData.get("vendor_contact") as string)?.trim() || null;
  const estimated_cost = formData.get("estimated_cost") ? parseFloat(formData.get("estimated_cost") as string) : null;
  const started_at = (formData.get("started_at") as string) || null;
  const next_service_date = (formData.get("next_service_date") as string) || null;

  if (!asset_id) return { errors: { asset_id: ["Asset is required"] } };
  if (!description) return { errors: { description: ["Description is required"] } };

  await withTransaction(async (tx) => {
    await tx.run(`
      INSERT INTO maintenance_logs (asset_id, maintenance_type, description, vendor_name,
        vendor_contact, estimated_cost, started_at, next_service_date, status, logged_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'In Progress', ?)
    `, asset_id, maintenance_type, description, vendor_name, vendor_contact,
      estimated_cost, started_at, next_service_date, userId);

    await tx.run("UPDATE assets SET status='In Repair', updated_at=NOW() WHERE id=?", asset_id);
  });

  revalidatePath("/maintenance");
  revalidatePath("/assets");
  redirect("/maintenance");
}

export async function closeMaintenance(id: number, actual_cost: number | null, notes: string) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;

  const db = getDb();
  const log = await db.prepare("SELECT * FROM maintenance_logs WHERE id = ?").get(id) as any;
  if (!log) return;

  await withTransaction(async (tx) => {
    await tx.run(`
      UPDATE maintenance_logs SET status='Completed', actual_cost=?, notes=?,
        completed_at=NOW(), updated_at=NOW() WHERE id=?
    `, actual_cost, notes || null, id);
    await tx.run("UPDATE assets SET status='Available', updated_at=NOW() WHERE id=?", log.asset_id);
  });

  revalidatePath("/maintenance");
  revalidatePath("/assets");
}
