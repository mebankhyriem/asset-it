import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  await verifySession();
  const db = getDb();
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const employees = q
    ? await db.prepare(`
        SELECT e.*, d.name as department_name
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.name LIKE ? OR e.employee_id LIKE ?
        ORDER BY e.name LIMIT 20
      `).all(`%${q}%`, `%${q}%`)
    : await db.prepare(`
        SELECT e.*, d.name as department_name
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY e.name
      `).all();

  return Response.json({ employees });
}
