"use server";

// Public auth actions — NO import of verifySession or dal.ts.
// Pages that are accessible without a session must import from here.

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db/client";
import { createSession } from "@/lib/session";

export type AuthState = { error?: string } | undefined;

export async function login(_state: AuthState, formData: FormData): Promise<AuthState> {
  const email    = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password are required." };

  const db   = getDb();
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;

  if (!user)               return { error: "Invalid email or password." };
  if (user.is_active === 0) return { error: "This account has been deactivated. Contact your Inventory Manager." };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { error: "Invalid email or password." };

  await createSession(user.id, user.role);
  if (user.must_change_password) redirect("/first-login");
  redirect("/dashboard");
}
