"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { deleteSession } from "@/lib/session";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

export type AuthState = {
  error?: string;
} | undefined;

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function setNewPassword(_state: AuthState, formData: FormData): Promise<AuthState> {
  const { userId } = await verifySession();
  const password = formData.get("password") as string;
  const confirm  = formData.get("confirm") as string;

  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const db = getDb();
  const hash = await bcrypt.hash(password, 10);
  await db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?").run(hash, userId);
  redirect("/dashboard");
}
