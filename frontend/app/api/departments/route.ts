import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET() {
  await verifySession();
  const db = getDb();
  const departments = await db.prepare("SELECT * FROM departments ORDER BY name").all();
  return Response.json({ departments });
}
