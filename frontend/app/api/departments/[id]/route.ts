import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const deptId = parseInt(id);
  const db = getDb();

  const department = await db.prepare("SELECT * FROM departments WHERE id = ?").get(deptId);
  if (!department) return Response.json({ error: "Not found" }, { status: 404 });

  // Everything shown on the department's detail page — the list page only shows counts,
  // this is where "click a department, see everything" actually lives.
  const users = await db.prepare(`
    SELECT id, name, email, role FROM users
    WHERE department_id = ? AND is_active = 1 AND role = 'DEPT_USER' ORDER BY name
  `).all(deptId);

  const employees = await db.prepare(`
    SELECT id, name, employee_id, designation, phone, email FROM employees
    WHERE department_id = ? ORDER BY name
  `).all(deptId);

  const assets = await db.prepare(`
    SELECT id, asset_id, asset_type, status FROM assets
    WHERE department_id = ? AND status != 'Condemned' ORDER BY asset_type, asset_id
  `).all(deptId);

  return Response.json({ department, users, employees, assets });
}
