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
  if (status) { where += " AND ml.status = ?"; params.push(status); }

  const logs = await db.prepare(`
    SELECT ml.*, a.asset_id as asset_asset_id, a.asset_type as asset_name, a.ict_category as asset_category,
           u.name as logged_by_name
    FROM maintenance_logs ml
    JOIN assets a ON ml.asset_id = a.id
    LEFT JOIN users u ON ml.logged_by = u.id
    ${where} ORDER BY ml.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM maintenance_logs ml ${where}`).get(...params) as any).cnt;
  return Response.json({ logs, total });
}
