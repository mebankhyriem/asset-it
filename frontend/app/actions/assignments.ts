"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createAssignment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const asset_id = parseInt(formData.get("asset_id") as string);
  const assigned_to_name = (formData.get("assigned_to_name") as string)?.trim();
  const assigned_to_type = formData.get("assigned_to_type") as string;
  const department_id = formData.get("department_id") ? parseInt(formData.get("department_id") as string) : null;
  const external_org_id = formData.get("external_org_id") ? parseInt(formData.get("external_org_id") as string) : null;
  const expected_return_date = (formData.get("expected_return_date") as string) || null;
  const condition_on_issue = (formData.get("condition_on_issue") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!asset_id) return { errors: { asset_id: ["Asset is required"] } };
  if (!assigned_to_name) return { errors: { assigned_to_name: ["Assignee name is required"] } };

  const asset = await db.prepare("SELECT * FROM assets WHERE id = ? AND status = 'Available'").get(asset_id) as any;
  if (!asset) return { errors: { asset_id: ["Asset is not available"] } };

  await withTransaction(async (tx) => {
    await tx.run("UPDATE assets SET status='Assigned', updated_at=NOW() WHERE id=?", asset_id);
    await tx.run(`
      INSERT INTO asset_assignments (asset_id, assigned_to_name, assigned_to_type, department_id,
        external_org_id, expected_return_date, condition_on_issue, notes, issued_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, asset_id, assigned_to_name, assigned_to_type, department_id, external_org_id,
      expected_return_date, condition_on_issue, notes, userId);
  });

  revalidatePath("/assignments");
  revalidatePath("/assets");
  redirect("/assignments");
}

export async function returnAsset(assignmentId: number, condition: string, notes: string) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;

  const db = getDb();
  const assignment = await db.prepare("SELECT * FROM asset_assignments WHERE id = ?").get(assignmentId) as any;
  if (!assignment || assignment.status !== "Active") return;

  await withTransaction(async (tx) => {
    await tx.run(`
      UPDATE asset_assignments SET status='Returned', actual_return_date=CURDATE(),
        condition_on_return=?, notes=COALESCE(CONCAT(notes, ' | Return: ', ?), notes, ?),
        updated_at=NOW() WHERE id=?
    `, condition || null, notes, notes, assignmentId);
    await tx.run("UPDATE assets SET status='Available', updated_at=NOW() WHERE id=?", assignment.asset_id);
  });

  revalidatePath("/assignments");
  revalidatePath("/assets");
}
