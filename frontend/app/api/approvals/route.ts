import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { ROLE_STEPS } from "@/lib/types";

export async function GET(_request: NextRequest) {
  const { role } = await verifySession();
  const db = getDb();

  const steps = ROLE_STEPS[role] ?? [];
  if (steps.length === 0) return Response.json({ approvals: [] });

  const placeholders = steps.map(() => "?").join(", ");
  const approvals = await db.prepare(`
    SELECT a.*, r.request_number, r.asset_type, r.quantity,
           r.status as req_status, r.justification,
           u.name as requested_by_name
    FROM approvals a
    JOIN requests r ON a.request_id = r.id
    LEFT JOIN users u ON r.requested_by = u.id
    WHERE a.step IN (${placeholders}) AND a.status = 'Pending'
    ORDER BY a.created_at ASC
  `).all(...steps);

  return Response.json({ approvals });
}
