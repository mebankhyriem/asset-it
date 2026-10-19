"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createEmployee(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (!["INVENTORY_MANAGER", "DEPT_USER"].includes(role)) return { message: "Unauthorized" };

  const db = getDb();
  const employee_id  = (formData.get("employee_id") as string)?.trim();
  const name         = (formData.get("name") as string)?.trim();
  const email        = (formData.get("email") as string)?.trim() || null;
  const phone        = (formData.get("phone") as string)?.trim() || null;
  const designation  = (formData.get("designation") as string)?.trim() || null;
  const department_id = formData.get("department_id") ? parseInt(formData.get("department_id") as string) : null;

  if (!employee_id) return { errors: { employee_id: ["Office ID Number is required"] } };
  if (!name)        return { errors: { name: ["Name is required"] } };

  const existing = await db.prepare("SELECT id FROM employees WHERE employee_id = ?").get(employee_id);
  if (existing) return { errors: { employee_id: ["Office ID Number already exists"] } };

  await db.prepare(`
    INSERT INTO employees (employee_id, name, email, phone, designation, department_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(employee_id, name, email, phone, designation, department_id, userId);

  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployee(id: number, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (!["INVENTORY_MANAGER", "DEPT_USER"].includes(role)) return { message: "Unauthorized" };

  const db = getDb();
  const employee_id  = (formData.get("employee_id") as string)?.trim();
  const name         = (formData.get("name") as string)?.trim();
  const email        = (formData.get("email") as string)?.trim() || null;
  const phone        = (formData.get("phone") as string)?.trim() || null;
  const designation  = (formData.get("designation") as string)?.trim() || null;
  const department_id = formData.get("department_id") ? parseInt(formData.get("department_id") as string) : null;

  if (!employee_id) return { errors: { employee_id: ["Office ID Number is required"] } };
  if (!name)        return { errors: { name: ["Name is required"] } };

  const existing = await db.prepare("SELECT id FROM employees WHERE employee_id = ? AND id != ?").get(employee_id, id);
  if (existing) return { errors: { employee_id: ["Office ID Number already in use"] } };

  await db.prepare(`
    UPDATE employees SET employee_id=?, name=?, email=?, phone=?, designation=?, department_id=?, updated_at=NOW()
    WHERE id=?
  `).run(employee_id, name, email, phone, designation, department_id, id);

  revalidatePath("/employees");
  redirect("/employees");
}

export async function deleteEmployee(id: number) {
  const { role } = await verifySession();
  if (!["INVENTORY_MANAGER", "DEPT_USER"].includes(role)) return;
  const db = getDb();
  await db.prepare("DELETE FROM employees WHERE id = ?").run(id);
  revalidatePath("/employees");
  redirect("/employees");
}
