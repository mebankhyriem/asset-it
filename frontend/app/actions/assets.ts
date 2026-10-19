"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getDb, type DbHandle } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";
import { ASSET_TYPES, ASSET_TYPE_CATEGORY, ASSET_TYPE_CODE, OS_OPTIONS, RAM_OPTIONS, PROCESSOR_OPTIONS } from "@/lib/types";
import { recordAssetEvent } from "@/lib/history";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

// Every preset value across both device kinds, used to tell whether something typed in
// via "Other" on the Add Asset specs prompt is actually new and worth remembering.
const KNOWN_OS = new Set([...OS_OPTIONS.computer, ...OS_OPTIONS.mobile]);
const KNOWN_RAM = new Set(RAM_OPTIONS);
const KNOWN_PROCESSORS = new Set([...PROCESSOR_OPTIONS.computer, ...PROCESSOR_OPTIONS.mobile]);

// Saves a newly-typed spec value so it shows up as a normal pick-list option from now on —
// see spec_options in the schema and GET /api/spec-options.
async function rememberSpecOption(db: DbHandle, kind: "os" | "ram" | "processor", value: string) {
  await db.prepare("INSERT IGNORE INTO spec_options (kind, value) VALUES (?, ?)").run(kind, value);
}

// Auto-generates asset IDs as {CODE}-{YEAR}-{seq}, e.g. DSK-2026-004, continuing
// the highest existing sequence number for that type + year.
async function generateAssetIds(db: DbHandle, assetType: string, count: number): Promise<string[]> {
  const code = ASSET_TYPE_CODE[assetType] ?? assetType.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
  const year = new Date().getFullYear();
  const prefix = `${code}-${year}-`;

  const existing = await db.prepare("SELECT asset_id FROM assets WHERE asset_id LIKE ?").all(`${prefix}%`) as { asset_id: string }[];
  let maxSeq = 0;
  for (const { asset_id } of existing) {
    const n = parseInt(asset_id.slice(prefix.length), 10);
    if (!isNaN(n) && n > maxSeq) maxSeq = n;
  }

  return Array.from({ length: count }, (_, i) => `${prefix}${String(maxSeq + i + 1).padStart(3, "0")}`);
}

export async function createAsset(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const asset_type = (formData.get("asset_type") as string)?.trim();

  // Structured OS / RAM / Processor specs prompt (Laptop / Desktop / Tablet / Mobile
  // Phone only) — combined into the single specifications text the DB stores. Falls back
  // to a plain "specifications" field for any other caller that might post one directly.
  const os = (formData.get("os") as string)?.trim() || null;
  const ram = (formData.get("ram") as string)?.trim() || null;
  const processor = (formData.get("processor") as string)?.trim() || null;
  const specParts = [os && `OS: ${os}`, ram && `RAM: ${ram}`, processor && `Processor: ${processor}`].filter(Boolean);
  const specifications = specParts.length > 0 ? specParts.join(" · ") : ((formData.get("specifications") as string)?.trim() || null);

  const description = (formData.get("description") as string)?.trim() || null;
  // New assets always start Available and unassigned — they sit in general inventory
  // until actually issued to a department. Serial numbers are recorded at assignment time.
  const status = "Available";
  const department_id = null;
  const quantity = Math.max(1, parseInt(formData.get("quantity") as string) || 1);
  const ict_category = ASSET_TYPE_CATEGORY[asset_type] ?? null;

  if (!asset_type) return { errors: { asset_type: ["Asset type is required"] } };

  // Safety net behind AssetTypeSelect's client-side lookup (which can be bypassed by
  // submitting the form directly): if this isn't a recognized preset, check whether it's
  // actually a near-duplicate of an existing type under different casing/spacing (e.g.
  // "laptop" vs "Laptop") rather than a genuinely new one, and block it if so.
  if (!ASSET_TYPES.includes(asset_type)) {
    const dbTypes = await db.prepare("SELECT DISTINCT asset_type FROM assets WHERE asset_type != ''").all() as { asset_type: string }[];
    const known = new Set([...ASSET_TYPES, ...dbTypes.map((r) => r.asset_type)]);
    const exactCaseMatch = [...known].find((t) => t.toLowerCase() === asset_type.toLowerCase() && t !== asset_type);
    if (exactCaseMatch) {
      return { errors: { asset_type: [`"${exactCaseMatch}" already exists — please select it from the list instead of retyping it.`] } };
    }
  }

  const ids = await generateAssetIds(db, asset_type, quantity);
  for (const bulkId of ids) {
    const existing = await db.prepare("SELECT id FROM assets WHERE asset_id = ?").get(bulkId);
    if (existing) return { errors: { asset_type: [`Generated asset ID "${bulkId}" already exists — please retry`] } };
  }

  // Any value that isn't one of the hardcoded presets came in through "Other" — save it
  // so it's a normal option next time, instead of everyone having to retype it forever.
  if (os && !KNOWN_OS.has(os)) await rememberSpecOption(db, "os", os);
  if (ram && !KNOWN_RAM.has(ram)) await rememberSpecOption(db, "ram", ram);
  if (processor && !KNOWN_PROCESSORS.has(processor)) await rememberSpecOption(db, "processor", processor);

  // recordAssetEvent runs on the pool (not this transaction's connection), so it can't
  // run inside the transaction — it would block waiting to see a row inserted by a
  // still-uncommitted transaction on a different connection. Collect the new ids and
  // record history after the transaction commits instead.
  const insertedIds: number[] = [];
  await withTransaction(async (tx) => {
    for (const id of ids) {
      const r = await tx.prepare(`
        INSERT INTO assets (asset_id, asset_type, specifications, description, status, department_id, ict_category, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, asset_type, specifications, description, status, department_id, ict_category, userId);
      insertedIds.push(r.insertId);
    }
  });
  for (const insertedId of insertedIds) {
    await recordAssetEvent(insertedId, "Created", userId, `Type: ${asset_type}`);
  }

  revalidatePath("/", "layout");
  redirect("/assets");
}

export async function updateAsset(id: number, _state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const db = getDb();
  const asset_id = (formData.get("asset_id") as string)?.trim();
  const asset_type = (formData.get("asset_type") as string)?.trim();
  const serial_number = (formData.get("serial_number") as string)?.trim();
  const mac_address = (formData.get("mac_address") as string)?.trim() || null;
  const specifications = (formData.get("specifications") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const status = formData.get("status") as string;
  let department_id = formData.get("department_id") ? parseInt(formData.get("department_id") as string) : null;
  let room_number = (formData.get("room_number") as string)?.trim() || null;
  // When updating, if status is set to Available, clear department/room assignment
  if (status === "Available") { department_id = null; room_number = null; }
  const ict_category = ASSET_TYPE_CATEGORY[asset_type] ?? null;

  if (!asset_id) return { errors: { asset_id: ["Asset ID is required"] } };
  if (!asset_type) return { errors: { asset_type: ["Asset type is required"] } };
  if (!specifications) return { errors: { specifications: ["Specifications are required"] } };
  if (!serial_number) return { errors: { serial_number: ["Serial number is required"] } };

  const existing = await db.prepare("SELECT id FROM assets WHERE asset_id = ? AND id != ?").get(asset_id, id);
  if (existing) return { errors: { asset_id: ["Asset ID already in use by another asset"] } };

  if (serial_number) {
    const snExists = await db.prepare("SELECT id FROM assets WHERE serial_number = ? AND id != ?").get(serial_number, id);
    if (snExists) return { errors: { serial_number: ["Serial number already registered on another asset"] } };
  }

  const before = await db.prepare("SELECT status FROM assets WHERE id = ?").get(id) as any;
  const issued_date = (formData.get("issued_date") as string)?.trim() || null;
  const end_of_life_date = (formData.get("end_of_life_date") as string)?.trim() || null;

  await db.prepare(`
    UPDATE assets SET asset_id=?, asset_type=?, serial_number=?, mac_address=?, specifications=?, description=?, status=?, department_id=?, room_number=?,
      ict_category=?, issued_date=?, end_of_life_date=?, updated_at=NOW()
    WHERE id=?
  `).run(asset_id, asset_type, serial_number, mac_address, specifications, description, status, department_id, room_number, ict_category, issued_date, end_of_life_date, id);

  const notes = before?.status !== status ? `Status changed: ${before?.status} → ${status}` : "Details updated";
  await recordAssetEvent(id, "Updated", userId, notes);

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  redirect(`/assets/${id}`);
}

export async function restoreToInventory(id: number) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;
  const db = getDb();
  const result = await db.prepare("UPDATE assets SET status='Available', updated_at=NOW() WHERE id=? AND status='Returned'").run(id);
  if (result.affectedRows > 0) await recordAssetEvent(id, "Restored to Inventory", userId);
  revalidatePath("/", "layout");
  redirect(`/assets/${id}`);
}

export async function recordDisposal(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { message: "Unauthorized" };

  const id               = parseInt(formData.get("asset_id") as string);
  const disposal_method    = (formData.get("disposal_method") as string)?.trim() || null;
  const disposal_recycler  = (formData.get("disposal_recycler") as string)?.trim() || null;
  const disposal_reference = (formData.get("disposal_reference") as string)?.trim() || null;

  const db = getDb();
  const asset = await db.prepare("SELECT * FROM assets WHERE id = ? AND status = 'Condemned'").get(id) as any;
  if (!asset) return { errors: { _: ["Asset not found or not in Condemned status"] } };

  await db.prepare(`
    UPDATE assets SET status='Disposed', disposal_method=?, disposal_recycler=?, disposal_reference=?,
    disposal_date=CURDATE(), updated_at=NOW() WHERE id=?
  `).run(disposal_method, disposal_recycler, disposal_reference, id);

  const notes = [
    disposal_method ? `Method: ${disposal_method}` : null,
    disposal_recycler ? `Recycler: ${disposal_recycler}` : null,
    disposal_reference ? `Ref: ${disposal_reference}` : null,
  ].filter(Boolean).join(" · ") || "Disposed";
  await recordAssetEvent(id, "Disposed", userId, notes);

  revalidatePath("/", "layout");
  redirect(`/assets/${id}`);
}

export async function deleteAsset(id: number) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return;
  const db = getDb();
  const asset = await db.prepare("SELECT status FROM assets WHERE id = ?").get(id) as any;
  if (!asset || asset.status !== "Available") return;
  await withTransaction(async (tx) => {
    await tx.setForeignKeyChecks(false);
    await tx.run("DELETE FROM asset_history WHERE asset_id = ?", id);
    await tx.run("DELETE FROM assets WHERE id = ?", id);
    await tx.setForeignKeyChecks(true);
  });
  revalidatePath("/assets");
  redirect("/assets");
}
