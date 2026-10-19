"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";
import { generateEmployeeId } from "@/lib/utils";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createDepartment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const name = (formData.get("name") as string)?.trim();

  // Optionally create the department's employee (DEPT_USER) account in the same step,
  // instead of requiring a separate trip to Users > New — all three fields are required
  // together if any one of them is filled in; leave all blank to add the department alone.
  const employee_name = (formData.get("employee_name") as string)?.trim() || null;
  const employee_email = (formData.get("employee_email") as string)?.trim().toLowerCase() || null;
  const employee_password = (formData.get("employee_password") as string) || "";

  if (!name) return { errors: { name: ["Department name is required"] } };

  const existing = await db.prepare("SELECT id FROM departments WHERE name = ?").get(name);
  if (existing) return { errors: { name: ["Department name already exists"] } };

  const addingEmployee = !!(employee_name || employee_email || employee_password);
  if (addingEmployee) {
    if (!employee_name) return { errors: { employee_name: ["Employee name is required"] } };
    if (!employee_email) return { errors: { employee_email: ["Employee email is required"] } };
    if (!employee_password || employee_password.length < 6) return { errors: { employee_password: ["Password must be at least 6 characters"] } };

    const emailTaken = await db.prepare("SELECT id FROM users WHERE email = ?").get(employee_email);
    if (emailTaken) return { errors: { employee_email: ["Email already in use"] } };
  }

  await withTransaction(async (tx) => {
    const dept = await tx.run("INSERT INTO departments (name) VALUES (?)", name);

    if (addingEmployee) {
      const employee_id = await generateEmployeeId(tx);
      const password_hash = await bcrypt.hash(employee_password, 10);
      await tx.run(`
        INSERT INTO users (employee_id, name, email, password_hash, role, department_id, is_active, must_change_password)
        VALUES (?, ?, ?, ?, 'DEPT_USER', ?, 1, 1)
      `, employee_id, employee_name, employee_email, password_hash, dept.insertId);
    }
  });

  revalidatePath("/departments");
  revalidatePath("/users");
  redirect("/departments");
}

export async function updateDepartment(id: number, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const name = (formData.get("name") as string)?.trim();

  if (!name) return { errors: { name: ["Department name is required"] } };

  const existing = await db.prepare("SELECT id FROM departments WHERE name = ? AND id != ?").get(name, id);
  if (existing) return { errors: { name: ["Department name already in use"] } };

  await db.prepare("UPDATE departments SET name = ? WHERE id = ?").run(name, id);
  revalidatePath("/departments");
  redirect("/departments");
}

export async function deleteDepartment(id: number): Promise<{ error?: string } | undefined> {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  const db = getDb();

  // Only Dept Users actually belong to a single department — IM/SIO/JIO oversee all departments and shouldn't block deletion.
  const userCount = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE department_id = ? AND is_active = 1 AND role = 'DEPT_USER'").get(id) as any).c;
  const employeeCount = (await db.prepare("SELECT COUNT(*) as c FROM employees WHERE department_id = ?").get(id) as any).c;
  const assetCount = (await db.prepare("SELECT COUNT(*) as c FROM assets WHERE department_id = ?").get(id) as any).c;

  if (userCount > 0 || employeeCount > 0 || assetCount > 0) {
    const parts = [];
    if (userCount > 0) parts.push(`${userCount} user${userCount !== 1 ? "s" : ""}`);
    if (employeeCount > 0) parts.push(`${employeeCount} employee${employeeCount !== 1 ? "s" : ""}`);
    if (assetCount > 0) parts.push(`${assetCount} asset${assetCount !== 1 ? "s" : ""}`);
    return { error: `Cannot delete — ${parts.join(" and ")} still assigned to this department. Reassign or remove them first.` };
  }

  await db.prepare("DELETE FROM departments WHERE id = ?").run(id);
  revalidatePath("/departments");
  redirect("/departments");
}
