import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

const SIGNED_UPLOADS_DIR = path.join(process.cwd(), "data", "uploads", "signed-requests");

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = await verifySession();
  if (!["INVENTORY_MANAGER", "JIO", "SIO"].includes(role)) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const db = getDb();

  const request = await db.prepare("SELECT bypass_signed_file FROM requests WHERE id = ?").get(parseInt(id)) as
    | { bypass_signed_file: string | null }
    | undefined;

  if (!request?.bypass_signed_file) return Response.json({ error: "Not found" }, { status: 404 });

  // bypass_signed_file is a filename we generated server-side (req-<id>-<timestamp>.<ext>) — never user input.
  const filename = request.bypass_signed_file;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  try {
    const buffer = await readFile(path.join(SIGNED_UPLOADS_DIR, filename));
    return new Response(buffer, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }
}
