import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const assignment = await db.prepare(`
    SELECT aa.*, a.asset_id as asset_asset_id, a.asset_type as asset_name,
           d.name as department_name, u.name as issued_by_name
    FROM asset_assignments aa
    JOIN assets a ON aa.asset_id = a.id
    LEFT JOIN departments d ON aa.department_id = d.id
    LEFT JOIN users u ON aa.issued_by = u.id
    WHERE aa.id = ?
  `).get(parseInt(id));

  if (!assignment) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ assignment });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await ctx.params;
  const { action, condition_on_return, notes } = await request.json();
  const db = getDb();

  if (action === "return") {
    const assignment = await db.prepare("SELECT * FROM asset_assignments WHERE id = ?").get(parseInt(id)) as any;
    if (!assignment) return Response.json({ error: "Not found" }, { status: 404 });

    await withTransaction(async (tx) => {
      await tx.run(`
        UPDATE asset_assignments SET status='Returned', actual_return_date=CURDATE(),
          condition_on_return=?, updated_at=NOW() WHERE id=?
      `, condition_on_return || null, parseInt(id));
      await tx.run("UPDATE assets SET status='Available', updated_at=NOW() WHERE id=?", assignment.asset_id);
    });
  }

  return Response.json({ success: true });
}
