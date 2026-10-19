import type { Request, Response, NextFunction } from "express";
import { COOKIE_NAME, decrypt, type SessionPayload } from "../lib/session.js";
import { getDb } from "../lib/db/client.js";

export type AuthUser = {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  role: SessionPayload["role"];
  departmentId: number | null;
  departmentName: string | null;
};

declare global {
  namespace Express {
    interface Request {
      session?: { userId: number; role: SessionPayload["role"] };
      user?: AuthUser;
    }
  }
}

// Express port of frontend's old lib/dal.ts::verifySession. Unlike the Next.js version,
// this can't redirect("/login") — it's a separate trust boundary now, so it just responds
// 401. The frontend's proxy.ts still does the redirect-for-UX gating; this is the real
// enforcement, since a page-level redirect on the frontend doesn't protect this API.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const session = await decrypt(token);
  if (!session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.session = { userId: session.userId, role: session.role };
  next();
}

// Port of getCurrentUser — loads the full user row (joined with department), rejecting
// inactive/missing users the same way the frontend version did.
export async function loadCurrentUser(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const db = getDb();
  const user = await db
    .prepare(
      `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.department_id,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ? AND u.is_active = 1`
    )
    .get(req.session.userId) as any;

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.user = {
    id: user.id,
    employeeId: user.employee_id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.department_id,
    departmentName: user.department_name,
  };
  next();
}

export function requireRole(...roles: SessionPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
