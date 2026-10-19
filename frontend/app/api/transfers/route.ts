import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  await verifySession();
  const db = getDb();
  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const page = parseInt(sp.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (status) { where += " AND t.status = ?"; params.push(status); }

  const transfers = await db.prepare(`
    SELECT t.*, a.asset_id as asset_code, a.asset_type,
           fd.name as from_dept_name, td.name as to_dept_name,
           iu.name as initiated_by_name
    FROM asset_transfers t
    JOIN assets a ON t.asset_id = a.id
    LEFT JOIN departments fd ON t.from_dept_id = fd.id
    LEFT JOIN departments td ON t.to_dept_id = td.id
    LEFT JOIN users iu ON t.initiated_by = iu.id
    ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM asset_transfers t ${where}`).get(...params) as any).cnt;
  return Response.json({ transfers, total });
}
