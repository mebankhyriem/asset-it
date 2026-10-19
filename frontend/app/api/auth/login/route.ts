import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/client";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  const db = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").get(email) as any;
  if (!user) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return Response.json({ error: "Invalid credentials" }, { status: 401 });

  await createSession(user.id, user.role);
  return Response.json({ success: true, role: user.role, name: user.name });
}
