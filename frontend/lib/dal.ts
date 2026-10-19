import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionToken } from "./session";
import { getDb } from "./db/client";

export type AuthUser = {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: "INVENTORY_MANAGER" | "SIO" | "JIO" | "DEPT_USER";
  departmentId: number | null;
  departmentName: string | null;
};

export const verifySession = cache(async () => {
  const token = await getSessionToken();
  const session = await decrypt(token);
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId, role: session.role };
});

export const getCurrentUser = cache(async (): Promise<AuthUser> => {
  const { userId } = await verifySession();
  const db = getDb();
  const user = await db
    .prepare(
      `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ? AND u.is_active = 1`
    )
    .get(userId) as any;

  if (!user) redirect("/login");

  return {
    id: user.id,
    employeeId: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.department_id,
    departmentName: user.department_name,
  };
});
