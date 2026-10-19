"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { getDb, type DbHandle } from "@/lib/db/client";
import { generateEmployeeId } from "@/lib/utils";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

// Finds a department by name (case-insensitive) or creates it — lets the user forms
// take a plain department name instead of requiring one to be pre-selected.
async function resolveDepartmentId(db: DbHandle, name: string | null): Promise<number | null> {
  if (!name) return null;
  const existing = await db.prepare("SELECT id FROM departments WHERE lower(name) = lower(?)").get(name) as { id: number } | undefined;
  if (existing) return existing.id;
  return (await db.prepare("INSERT INTO departments (name) VALUES (?)").run(name)).insertId;
}

export async function createUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const userRole = formData.get("role") as string;
  const department_name = (formData.get("department_name") as string)?.trim() || null;

  if (!name) return { errors: { name: ["Name is required"] } };
  if (!email) return { errors: { email: ["Email is required"] } };
  if (!password || password.length < 6) return { errors: { password: ["Password must be at least 6 characters"] } };
  if (!userRole) return { errors: { role: ["Role is required"] } };

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return { errors: { email: ["Email already in use"] } };

  const department_id = await resolveDepartmentId(db, department_name);
  const employee_id = await generateEmployeeId(db);
  const password_hash = await bcrypt.hash(password, 10);

  // IM creates the account directly — it's active immediately, no email verification needed.
  // must_change_password still forces the user to set their own password on first login.
  await db.prepare(`
    INSERT INTO users (employee_id, name, email, password_hash, role, department_id, is_active, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1)
  `).run(employee_id, name, email, password_hash, userRole, department_id);

  revalidatePath("/users");
  redirect("/users?created=1");
}

export async function updateUser(id: number, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const name = (formData.get("name") as string)?.trim();
  const userRole = formData.get("role") as string;
  const department_name = (formData.get("department_name") as string)?.trim() || null;
  const is_active = formData.get("is_active") === "1" ? 1 : 0;

  if (!name) return { errors: { name: ["Name is required"] } };

  const department_id = await resolveDepartmentId(db, department_name);

  await db.prepare(`
    UPDATE users SET name=?, role=?, department_id=?, is_active=?, updated_at=NOW()
    WHERE id=?
  `).run(name, userRole, department_id, is_active, id);

  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  redirect(`/users/${id}`);
}

export async function deactivateUser(id: number) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;
  const db = getDb();
  await db.prepare("UPDATE users SET is_active=0, updated_at=NOW() WHERE id=?").run(id);
  revalidatePath("/users");
}

export async function deleteUser(id: number) {
  const { role, userId } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;
  if (id === userId) return; // prevent self-deletion
  const db = getDb();
  await db.prepare("DELETE FROM email_otp WHERE email = (SELECT email FROM users WHERE id = ?)").run(id);
  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  revalidatePath("/users");
}

export async function resetUserPassword(id: number, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const newPassword = formData.get("new_password") as string;
  if (!newPassword || newPassword.length < 6) return { errors: { new_password: ["Password must be at least 6 characters"] } };

  const db = getDb();
  const hash = await bcrypt.hash(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?").run(hash, id);
  return { message: "Password reset successfully" };
}

export async function updateOwnProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();
  const db = getDb();

  const name        = (formData.get("name") as string)?.trim();
  const employee_id = (formData.get("employee_id") as string)?.trim();
  const email       = (formData.get("email") as string)?.trim().toLowerCase();
  const designation = (formData.get("designation") as string)?.trim() || null;
  const phone       = (formData.get("phone") as string)?.trim() || null;

  if (!name)        return { errors: { name:        ["Name is required"] } };
  if (!employee_id) return { errors: { employee_id: ["Office ID Number is required"] } };
  if (!email)       return { errors: { email:       ["Email is required"] } };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { errors: { email: ["Enter a valid email address"] } };

  const empTaken = await db.prepare("SELECT id FROM users WHERE employee_id = ? AND id != ?").get(employee_id, userId);
  if (empTaken) return { errors: { employee_id: ["Office ID Number already in use by another account"] } };

  const emailTaken = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, userId);
  if (emailTaken) return { errors: { email: ["Email already in use by another account"] } };

  await db.prepare(`
    UPDATE users SET name=?, employee_id=?, email=?, designation=?, phone=?, updated_at=NOW() WHERE id=?
  `).run(name, employee_id, email, designation, phone, userId);

  return { message: "Profile updated successfully" };
}

export async function changeOwnPassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();

  const current = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!current) return { errors: { current_password: ["Current password is required"] } };
  if (!newPassword || newPassword.length < 6) return { errors: { new_password: ["New password must be at least 6 characters"] } };
  if (newPassword !== confirm) return { errors: { confirm_password: ["Passwords do not match"] } };

  const db = getDb();
  const user = await db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as any;
  const valid = await bcrypt.compare(current, user.password_hash);
  if (!valid) return { errors: { current_password: ["Current password is incorrect"] } };

  const hash = await bcrypt.hash(newPassword, 10);
  await db.prepare("UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?").run(hash, userId);
  return { message: "Password changed successfully" };
}
