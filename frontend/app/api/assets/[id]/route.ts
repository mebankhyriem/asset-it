import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const asset = await db.prepare(`
    SELECT a.*, d.name as department_name, u.name as created_by_name
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.created_by = u.id
    WHERE a.id = ?
  `).get(parseInt(id)) as any;

  if (!asset) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ asset });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const body = await request.json();
  const db = getDb();

  const allowed = ["asset_id", "asset_type", "mac_address", "specifications", "description", "status", "department_id"];
  const fields = Object.entries(body).filter(([k]) => allowed.includes(k)).map(([k]) => `${k}=?`).join(", ");
  const values = Object.entries(body).filter(([k]) => allowed.includes(k)).map(([, v]) => v);

  if (!fields) return Response.json({ error: "No fields to update" }, { status: 400 });

  await db.prepare(`UPDATE assets SET ${fields}, updated_at=NOW() WHERE id=?`).run(...values, parseInt(id));
  return Response.json({ success: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await ctx.params;
  const db = getDb();
  const result = await db.prepare("DELETE FROM assets WHERE id = ? AND status = 'Available'").run(parseInt(id));
  if (result.affectedRows === 0) return Response.json({ error: "Cannot delete" }, { status: 400 });
  return Response.json({ success: true });
}
