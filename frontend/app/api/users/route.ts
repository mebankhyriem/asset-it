import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return Response.json({ error: "Unauthorized" }, { status: 403 });

  const db = getDb();
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q");

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)"; const qp = `%${q}%`; params.push(qp, qp, qp); }

  const users = await db.prepare(`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.is_active, u.created_at,
           d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    ${where} ORDER BY u.name
  `).all(...params);

  return Response.json({ users });
}
