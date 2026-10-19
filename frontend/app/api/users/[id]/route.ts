import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await ctx.params;
  const db = getDb();

  const user = await db.prepare(`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.is_active, u.department_id,
           u.created_at, u.updated_at, d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(parseInt(id));

  if (!user) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ user });
}
