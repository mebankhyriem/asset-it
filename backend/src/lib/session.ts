import { SignJWT, jwtVerify } from "jose";
import type { Response } from "express";

export type SessionPayload = {
  userId: number;
  role: "INVENTORY_MANAGER" | "SIO" | "JIO" | "DEPT_USER";
  expiresAt: string;
};

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "fallback-secret-change-in-production-32chars"
);

export const COOKIE_NAME = "session";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Sets the session cookie on an Express response. Same shape (httpOnly, sameSite=lax,
// path=/) as the frontend's old lib/session.ts so behavior is unchanged for callers
// that go through the reverse-proxied /api/* path.
export async function createSession(res: Response, userId: number, role: SessionPayload["role"]) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  const token = await encrypt({ userId, role, expiresAt });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
    path: "/",
  });
}

export function deleteSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}
