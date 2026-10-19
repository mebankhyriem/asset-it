import "server-only";
import type { DbHandle } from "@/lib/db/client";

export async function generateRequestNumber(db: DbHandle): Promise<string> {
  const year = new Date().getFullYear();
  const row = await db
    .prepare(
      `SELECT request_number FROM requests WHERE request_number LIKE 'REQ-${year}-%' ORDER BY id DESC LIMIT 1`
    )
    .get() as { request_number: string } | undefined;
  const lastNum = row ? parseInt(row.request_number.split("-")[2], 10) : 0;
  return `REQ-${year}-${String(lastNum + 1).padStart(4, "0")}`;
}

export async function generateEmployeeId(db: DbHandle): Promise<string> {
  const row = await db
    .prepare(`SELECT employee_id FROM users ORDER BY id DESC LIMIT 1`)
    .get() as { employee_id: string } | undefined;
  const lastNum = row ? parseInt(row.employee_id.split("-")[1], 10) : 0;
  return `EMP-${String(lastNum + 1).padStart(3, "0")}`;
}

// Laptop / Desktop Computer / Tablet / Mobile Phone are the types that get the structured
// OS / RAM / Processor specs prompt on Add Asset (see lib/types.ts OS_OPTIONS etc.) — the
// only ones whose ID gets those specs folded in too.
const SPEC_ID_ASSET_TYPES = new Set(["Laptop", "Desktop Computer", "Tablet", "Mobile Phone / Smartphone"]);

// Pulls a single "Label: value" segment back out of the combined specifications text
// (e.g. "OS: Windows · RAM: 16 GB · Processor: Intel Core i5"), stripped of whitespace so
// it reads cleanly as one ID segment ("16 GB" → "16GB").
function extractSpec(specifications: string, label: string): string | null {
  const match = specifications.match(new RegExp(`${label}:\\s*([^·]+)`));
  return match ? match[1].trim().replace(/\s+/g, "") : null;
}

// Assets are added in bulk before their serial numbers are known, so they start out with
// a placeholder sequential ID like LAP-2026-002. Once a serial is actually recorded (at
// issuance), the ID is renamed to embed it instead so it's meaningful rather than an
// arbitrary counter. For Laptop/Desktop/Tablet/Phone, the OS/RAM/Processor specs are
// folded in too: LAP-2026-002 → LAP-2026-Windows-16GB-IntelCorei5-9876. Everything else
// just gets the serial: DSK-2026-002 → DSK-2026-9876 (no specs prompt for those types).
// Keeps the original {CODE}-{YEAR} prefix; returns the unchanged ID if it doesn't match
// that shape (e.g. it was hand-edited into something else) rather than guessing.
export function assetIdWithSerial(currentAssetId: string, assetType: string, specifications: string | null, serial: string): string {
  const parts = currentAssetId.split("-");
  if (parts.length < 3) return currentAssetId;
  const [code, year] = parts;
  const cleanSerial = serial.trim();

  if (SPEC_ID_ASSET_TYPES.has(assetType) && specifications) {
    const segments = [
      extractSpec(specifications, "OS"),
      extractSpec(specifications, "RAM"),
      extractSpec(specifications, "Processor"),
    ].filter((s): s is string => !!s);
    if (segments.length > 0) return `${code}-${year}-${segments.join("-")}-${cleanSerial}`;
  }

  return `${code}-${year}-${cleanSerial}`;
}
