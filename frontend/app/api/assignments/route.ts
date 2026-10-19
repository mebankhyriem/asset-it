import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  await verifySession();
  const db = getDb();
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") ?? "Active";
  const departmentId = sp.get("department_id");
  const assignedToName = sp.get("assigned_to_name");
  const q = sp.get("q");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  let where = "WHERE aa.status = ?";
  const params: any[] = [status];
  if (departmentId) { where += " AND aa.department_id = ?"; params.push(parseInt(departmentId)); }
  if (assignedToName) { where += " AND aa.assigned_to_name = ?"; params.push(assignedToName); }
  else if (q) { where += " AND aa.assigned_to_name LIKE ?"; params.push(`%${q}%`); }

  const assignments = await db.prepare(`
    SELECT aa.*, a.asset_id as asset_asset_id, a.asset_type as asset_name,
           a.room_number as asset_room_number, a.department_id as asset_department_id,
           d.name as department_name, ad.name as asset_department_name, u.name as issued_by_name
    FROM asset_assignments aa
    JOIN assets a ON aa.asset_id = a.id
    LEFT JOIN departments d ON aa.department_id = d.id
    LEFT JOIN departments ad ON a.department_id = ad.id
    LEFT JOIN users u ON aa.issued_by = u.id
    ${where} ORDER BY aa.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM asset_assignments aa ${where}`).get(...params) as any).cnt;
  return Response.json({ assignments, total });
}
