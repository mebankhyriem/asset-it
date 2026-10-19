import type { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

const DEFECT_PHOTOS_DIR = path.join(process.cwd(), "data", "uploads", "defect-photos");

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { userId, role } = await verifySession();
  const { id } = await ctx.params;
  const db = getDb();

  const request = await db.prepare("SELECT defect_photo, requested_by FROM requests WHERE id = ?").get(parseInt(id)) as
    | { defect_photo: string | null; requested_by: number }
    | undefined;

  if (!request?.defect_photo) return Response.json({ error: "Not found" }, { status: 404 });

  const canView = ["INVENTORY_MANAGER", "JIO", "SIO"].includes(role) || request.requested_by === userId;
  if (!canView) return Response.json({ error: "Unauthorized" }, { status: 403 });

  // defect_photo is a filename we generated server-side (req-<id>-<timestamp>.<ext>) — never user input.
  const filename = request.defect_photo;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  try {
    const buffer = await readFile(path.join(DEFECT_PHOTOS_DIR, filename));
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
