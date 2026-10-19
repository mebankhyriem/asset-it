import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export async function GET() {
  const { userId } = await verifySession();
  const db = getDb();

  const user = await db.prepare(`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id,
           u.designation, u.phone, d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(userId) as any;

  return Response.json({ user });
}
