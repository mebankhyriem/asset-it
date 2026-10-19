"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";
import { generateRequestNumber } from "@/lib/utils";
import { recordAssetEvent } from "@/lib/history";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createTransfer(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();

  const asset_id = parseInt(formData.get("asset_id") as string);
  const target_dept_id = parseInt(formData.get("target_dept_id") as string);
  const target_room_number = (formData.get("target_room_number") as string)?.trim() || null;
  const reason = (formData.get("reason") as string)?.trim() || null;

  if (!asset_id) return { errors: { asset_id: ["Select an asset"] } };
  if (!target_dept_id) return { errors: { target_dept_id: ["Select a target department"] } };
  if (!target_room_number) return { errors: { target_room_number: ["Room number is required"] } };

  const db = getDb();
  const asset = await db.prepare(`
    SELECT a.*, d.name as dept_name FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    WHERE a.id = ?
  `).get(asset_id) as any;

  if (!asset) return { errors: { asset_id: ["Asset not found"] } };
  if (asset.department_id === target_dept_id && (asset.room_number ?? "") === target_room_number) {
    return { errors: { target_room_number: ["Asset is already in this department and room"] } };
  }

  const request_number = await generateRequestNumber(db);

  await withTransaction(async (tx) => {
    const result = await tx.prepare(`
      INSERT INTO requests (request_number, requested_by, department_id, request_type,
                            asset_type, justification, service_asset_id, target_dept_id, target_room_number)
      VALUES (?, ?, ?, 'Transfer', ?, ?, ?, ?, ?)
    `).run(
      request_number, userId,
      asset.department_id ?? null,
      asset.asset_type,
      reason ?? "Asset transfer request",
      asset_id,
      target_dept_id,
      target_room_number
    );

    const requestId = result.insertId;
    await tx.prepare(`INSERT INTO approvals (request_id, step) VALUES (?, 'IM Initial Review')`).run(requestId);
  });

  revalidatePath("/", "layout");
  redirect("/transfers");
}

// Called by IM at the Final Processing step for Transfer requests
export async function confirmTransferFinal(approvalId: number) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  const db = getDb();

  const approval = await db.prepare(`
    SELECT a.*, r.id as req_id, r.service_asset_id, r.target_dept_id, r.target_room_number,
           r.department_id as from_dept_id, r.request_number
    FROM approvals a JOIN requests r ON a.request_id = r.id
    WHERE a.id = ? AND a.step = 'IM Final Processing' AND a.status = 'Pending'
  `).get(approvalId) as any;

  if (!approval) return { error: "Transfer step not found or already processed" };

  const asset = await db.prepare("SELECT room_number FROM assets WHERE id = ?").get(approval.service_asset_id) as any;
  const fromRoomNumber = asset?.room_number ?? null;

  await withTransaction(async (tx) => {
    await tx.run(`UPDATE approvals SET status='Approved', reviewer_id=?, reviewed_at=NOW() WHERE id=?`,
      userId, approvalId);
    await tx.run(`UPDATE assets SET department_id=?, room_number=?, updated_at=NOW() WHERE id=?`,
      approval.target_dept_id, approval.target_room_number, approval.service_asset_id);
    await tx.run(`UPDATE requests SET status='Transferred', updated_at=NOW() WHERE id=?`,
      approval.req_id);
    await tx.run(`
      INSERT INTO asset_transfers (asset_id, from_dept_id, to_dept_id, from_room_number, to_room_number, status, initiated_by, confirmed_by, confirmed_at)
      VALUES (?, ?, ?, ?, ?, 'Completed', ?, ?, NOW())
    `, approval.service_asset_id, approval.from_dept_id, approval.target_dept_id, fromRoomNumber, approval.target_room_number, userId, userId);
  });

  const toDept = await db.prepare("SELECT name FROM departments WHERE id = ?").get(approval.target_dept_id) as any;
  await recordAssetEvent(approval.service_asset_id, "Transferred", userId, `Moved to: ${toDept?.name ?? "Unknown"}, Room ${approval.target_room_number ?? "—"}`);

  revalidatePath("/", "layout");
}
