import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await ctx.params;
  const { action } = await request.json();
  const db = getDb();

  const transfer = await db.prepare("SELECT * FROM asset_transfers WHERE id = ?").get(parseInt(id)) as any;
  if (!transfer || transfer.status !== "Pending") {
    return Response.json({ error: "Cannot process this transfer" }, { status: 400 });
  }

  if (action === "confirm") {
    await withTransaction(async (tx) => {
      await tx.run(`
        UPDATE asset_transfers SET status='Completed', confirmed_by=?, confirmed_at=NOW(),
          updated_at=NOW() WHERE id=?
      `, userId, parseInt(id));
      if (transfer.to_dept_id) {
        await tx.run("UPDATE assets SET department_id=?, updated_at=NOW() WHERE id=?", transfer.to_dept_id, transfer.asset_id);
      }
    });
  } else if (action === "reject") {
    await db.prepare("UPDATE asset_transfers SET status='Rejected', updated_at=NOW() WHERE id=?").run(parseInt(id));
  }

  return Response.json({ success: true });
}
