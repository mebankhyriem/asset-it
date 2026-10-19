import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const { userId, role } = await verifySession();
  const db = getDb();
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const q = sp.get("q");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "20");
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (role === "DEPT_USER") { where += " AND r.requested_by = ?"; params.push(userId); }

  if (status) { where += " AND r.status = ?"; params.push(status); }
  if (q) { where += " AND (r.request_number LIKE ? OR r.asset_type LIKE ? OR d.name LIKE ?)"; const qp = `%${q}%`; params.push(qp, qp, qp); }

  const requests = await db.prepare(`
    SELECT r.*, d.name as department_name, u.name as requested_by_name
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (await db.prepare(`
    SELECT COUNT(*) as cnt FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    ${where}
  `).get(...params) as any).cnt;
  return Response.json({ requests, total, page, limit });
}
