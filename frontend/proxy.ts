import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

const PUBLIC_ROUTES = ["/login", "/verify-otp", "/verify-login-otp"];
const INVENTORY_MANAGER_ONLY = ["/users", "/departments"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session")?.value;
  const session = await decrypt(token);

  const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));

  if (!session?.userId && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session?.userId && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (session?.userId && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (
    session?.userId &&
    INVENTORY_MANAGER_ONLY.some((p) => pathname.startsWith(p)) &&
    session.role !== "INVENTORY_MANAGER"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // backend-api: rewritten (next.config.ts) through to the standalone backend/ service —
  // like api, it must return JSON 401s on its own, not an HTML redirect to /login.
  matcher: ["/((?!api|backend-api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)"],
};
