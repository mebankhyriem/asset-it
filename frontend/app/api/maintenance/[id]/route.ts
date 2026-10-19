import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const log = await db.prepare(`
    SELECT ml.*, a.asset_id as asset_asset_id, a.asset_type as asset_name, a.ict_category as asset_category,
           u.name as logged_by_name
    FROM maintenance_logs ml
    JOIN assets a ON ml.asset_id = a.id
    LEFT JOIN users u ON ml.logged_by = u.id
    WHERE ml.id = ?
  `).get(parseInt(id));

  if (!log) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ log });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await ctx.params;
  const body = await request.json();
  const db = getDb();

  const log = await db.prepare("SELECT * FROM maintenance_logs WHERE id = ?").get(parseInt(id)) as any;
  if (!log) return Response.json({ error: "Not found" }, { status: 404 });

  if (body.action === "close") {
    await withTransaction(async (tx) => {
      await tx.run(`
        UPDATE maintenance_logs SET status='Completed', actual_cost=?, notes=?,
          completed_at=NOW(), updated_at=NOW() WHERE id=?
      `, body.actual_cost ?? null, body.notes ?? null, parseInt(id));
      await tx.run("UPDATE assets SET status='Available', updated_at=NOW() WHERE id=?", log.asset_id);
    });
  } else {
    const allowedFields = ["status", "vendor_name", "vendor_contact", "estimated_cost", "actual_cost", "started_at", "completed_at", "next_service_date", "notes"];
    const fields = Object.entries(body).filter(([k]) => allowedFields.includes(k)).map(([k]) => `${k}=?`).join(", ");
    const values = Object.entries(body).filter(([k]) => allowedFields.includes(k)).map(([, v]) => v);
    if (fields) {
      await db.prepare(`UPDATE maintenance_logs SET ${fields}, updated_at=NOW() WHERE id=?`).run(...values, parseInt(id));
    }
  }

  return Response.json({ success: true });
}
