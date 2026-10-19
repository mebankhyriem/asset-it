import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  await verifySession();
  const db = getDb();
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const type = sp.get("type");
  const dept = sp.get("dept");
  const q = sp.get("q");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = parseInt(sp.get("limit") ?? "200");
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (status) { where += " AND a.status = ?"; params.push(status); }
  if (type) { where += " AND a.asset_type = ?"; params.push(type); }
  if (dept) { where += " AND a.department_id = ?"; params.push(parseInt(dept)); }
  if (q) { where += " AND (a.asset_id LIKE ? OR a.asset_type LIKE ?)"; const qp = `%${q}%`; params.push(qp, qp); }

  const assets = await db.prepare(`
    SELECT a.*, d.name as department_name
    FROM assets a LEFT JOIN departments d ON a.department_id = d.id
    ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM assets a ${where}`).get(...params) as any).cnt;

  return Response.json({ assets, total, page, limit });
}
