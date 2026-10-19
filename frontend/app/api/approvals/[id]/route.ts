import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const approval = await db.prepare(`
    SELECT a.*, u.name as reviewer_name
    FROM approvals a LEFT JOIN users u ON a.reviewer_id = u.id
    WHERE a.id = ?
  `).get(parseInt(id)) as any;

  if (!approval) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ approval });
}
