import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const request = await db.prepare(`
    SELECT r.*, d.name as department_name,
           u.name as requested_by_name,
           u.employee_id as requested_by_empid,
           u.email as requested_by_email,
           ta.asset_id as tentative_asset_code, ta.asset_type as tentative_asset_type,
           td.name as target_dept_name,
           sa.asset_id as service_asset_code, sa.asset_type as service_asset_type
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN assets ta ON r.tentative_asset_id = ta.id
    LEFT JOIN departments td ON r.target_dept_id = td.id
    LEFT JOIN assets sa ON r.service_asset_id = sa.id
    WHERE r.id = ?
  `).get(parseInt(id)) as any;

  if (!request) return Response.json({ error: "Not found" }, { status: 404 });

  const approvals = await db.prepare(`
    SELECT a.*, u.name as reviewer_name
    FROM approvals a
    LEFT JOIN users u ON a.reviewer_id = u.id
    WHERE a.request_id = ? ORDER BY a.created_at ASC
  `).all(parseInt(id));

  const items = await db.prepare(`
    SELECT ri.*, a.asset_id as allocated_asset_code, a.asset_type as allocated_asset_type, a.serial_number as allocated_serial
    FROM request_items ri
    LEFT JOIN assets a ON ri.allocated_asset_id = a.id
    WHERE ri.request_id = ? ORDER BY ri.id ASC
  `).all(parseInt(id));

  return Response.json({ request, approvals, items });
}
