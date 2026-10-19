import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await verifySession();
  const { id } = await ctx.params;
  const db = getDb();
  const employee = await db.prepare("SELECT * FROM employees WHERE id = ?").get(parseInt(id));
  if (!employee) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ employee });
}
