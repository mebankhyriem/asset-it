"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { getDb, type DbHandle } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";
import { generateRequestNumber } from "@/lib/utils";
import { recordAssetEvent } from "@/lib/history";

type ActionState = { errors?: Record<string, string[]>; message?: string } | undefined;

// Auto-registers a request's worker in the Employees directory if their office ID isn't
// already on record — so anyone typed in manually while submitting a request shows up on
// the Departments page (and is searchable/reusable next time) without a separate trip to
// Employees > Add. Never overwrites an existing entry, so curated data stays as-is.
async function rememberEmployee(db: DbHandle, opts: {
  employee_id: string; name: string; email: string | null; phone: string | null;
  designation: string | null; department_id: number | null; created_by: number;
}) {
  const existing = await db.prepare("SELECT id FROM employees WHERE employee_id = ?").get(opts.employee_id);
  if (existing) return;
  await db.prepare(`
    INSERT INTO employees (employee_id, name, email, phone, designation, department_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(opts.employee_id, opts.name, opts.email, opts.phone, opts.designation, opts.department_id, opts.created_by);
}

const DEFECT_PHOTOS_DIR = path.join(process.cwd(), "data", "uploads", "defect-photos");
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Optional photo evidence of a defect, attached to a Repair or Condemnation request.
// Returns an error object if the file fails validation, or null if it's fine to proceed
// (including the case where no file was actually chosen — this is never mandatory).
function validateDefectPhoto(file: File | null): { defect_photo: string[] } | null {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) return { defect_photo: ["Photo must be a JPG, PNG, or WEBP image"] };
  if (file.size > 10 * 1024 * 1024) return { defect_photo: ["Photo must be under 10MB"] };
  return null;
}

async function saveDefectPhoto(requestId: number, file: File): Promise<string> {
  await mkdir(DEFECT_PHOTOS_DIR, { recursive: true });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `req-${requestId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(DEFECT_PHOTOS_DIR, filename), buffer);
  return filename;
}

const EMERGENCY_DOCS_DIR = path.join(process.cwd(), "data", "uploads", "emergency-approvals");
const ALLOWED_EMERGENCY_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Lets the IM attach proof of approval to an emergency request after the fact — emergency
// requests skip the signed paperwork up front, so this is the only record of approval.
export async function uploadEmergencyApprovalDocument(requestId: number, file: File) {
  const { role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  if (!file || file.size === 0) return { error: "Choose a file to upload" };
  if (!ALLOWED_EMERGENCY_DOC_TYPES.includes(file.type)) return { error: "File must be a PDF or image (JPG, PNG, WEBP)" };
  if (file.size > 10 * 1024 * 1024) return { error: "File must be under 10MB" };

  const db = getDb();
  const request = await db.prepare("SELECT id FROM requests WHERE id = ? AND is_emergency = 1").get(requestId) as any;
  if (!request) return { error: "Request not found or not an emergency request" };

  await mkdir(EMERGENCY_DOCS_DIR, { recursive: true });
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `req-${requestId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(EMERGENCY_DOCS_DIR, filename), buffer);

  await db.prepare("UPDATE requests SET emergency_approval_document = ?, updated_at = NOW() WHERE id = ?").run(filename, requestId);

  revalidatePath("/requests");
  return {};
}

export async function createRequest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();
  const db = getDb();

  const justification = (formData.get("justification") as string)?.trim();
  const requester_name = (formData.get("requester_name") as string)?.trim() || null;
  const requester_employee_id = (formData.get("requester_employee_id") as string)?.trim() || null;
  const requester_email = (formData.get("requester_email") as string)?.trim() || null;
  const requester_designation = (formData.get("requester_designation") as string)?.trim() || null;
  const requester_phone = (formData.get("requester_phone") as string)?.trim() || null;

  const submittedDept = formData.get("department_id") as string;
  if (!submittedDept) return { errors: { department_id: ["Department is required"] } };
  const department_id = parseInt(submittedDept);

  // Parse multiple items: asset_type[] and quantity[]
  const assetTypes = formData.getAll("asset_type") as string[];
  const quantities = formData.getAll("quantity") as string[];
  const items = assetTypes.map((t, i) => ({ asset_type: t.trim(), quantity: parseInt(quantities[i]) || 1 }))
                           .filter(it => it.asset_type);

  if (items.length === 0) return { errors: { asset_type: ["At least one asset item is required"] } };
  if (!justification) return { errors: { justification: ["Justification is required"] } };
  if (!requester_name) return { errors: { requester_name: ["Worker name is required"] } };
  if (!requester_employee_id) return { errors: { requester_employee_id: ["Worker office ID number is required"] } };
  if (!requester_phone) return { errors: { requester_phone: ["Worker phone number is required"] } };
  if (!requester_designation) return { errors: { requester_designation: ["Worker designation is required"] } };

  await rememberEmployee(db, {
    employee_id: requester_employee_id, name: requester_name, email: requester_email,
    phone: requester_phone, designation: requester_designation, department_id, created_by: userId,
  });

  const request_type = "New Asset";

  const request_number = await generateRequestNumber(db);
  const primary_asset_type = items.length === 1 ? items[0].asset_type : "Multiple";
  const total_quantity = items.reduce((s, it) => s + it.quantity, 0);

  await withTransaction(async (tx) => {
    const result = await tx.prepare(`
      INSERT INTO requests (request_number, requested_by, department_id, request_type, asset_type, quantity, justification,
                            requester_name, requester_employee_id, requester_email,
                            requester_designation, requester_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(request_number, userId, department_id, request_type, primary_asset_type, total_quantity, justification,
           requester_name, requester_employee_id, requester_email, requester_designation, requester_phone);

    const requestId = result.insertId;

    const insertItem = tx.prepare(`INSERT INTO request_items (request_id, asset_type, quantity) VALUES (?, ?, ?)`);
    for (const item of items) await insertItem.run(requestId, item.asset_type, item.quantity);

    await tx.prepare(`INSERT INTO approvals (request_id, step) VALUES (?, 'IM Initial Review')`).run(requestId);
  });

  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function createServiceRequest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId } = await verifySession();
  const db = getDb();

  const request_type = formData.get("request_type") as string;
  const service_asset_id = parseInt(formData.get("service_asset_id") as string);
  const service_reason = (formData.get("service_reason") as string)?.trim();
  const requester_name = (formData.get("requester_name") as string)?.trim() || null;
  const requester_employee_id = (formData.get("requester_employee_id") as string)?.trim() || null;
  const requester_phone = (formData.get("requester_phone") as string)?.trim() || null;

  if (!request_type || !["Return", "Repair"].includes(request_type))
    return { errors: { request_type: ["Invalid request type"] } };
  if (!service_asset_id) return { errors: { service_asset_id: ["Please select an asset"] } };
  if (!service_reason) return { errors: { service_reason: ["Reason is required"] } };
  if (!requester_name) return { errors: { requester_name: ["Worker name is required"] } };
  if (!requester_phone) return { errors: { requester_phone: ["Phone number is required"] } };

  const defectPhoto = formData.get("defect_photo") as File | null;
  const photoError = validateDefectPhoto(defectPhoto);
  if (photoError) return { errors: photoError };

  const asset = await db.prepare("SELECT * FROM assets WHERE id = ? AND status = 'Assigned'").get(service_asset_id) as any;
  if (!asset) return { errors: { service_asset_id: ["Asset not found or not currently assigned"] } };

  const user = await db.prepare("SELECT department_id FROM users WHERE id = ?").get(userId) as any;

  // Office ID is optional on this form (unlike the main request form), so only register
  // an employee when one was actually given — the directory's employee_id column is unique.
  if (requester_employee_id) {
    await rememberEmployee(db, {
      employee_id: requester_employee_id, name: requester_name, email: null,
      phone: requester_phone, designation: null, department_id: user?.department_id ?? null, created_by: userId,
    });
  }

  const request_number = await generateRequestNumber(db);

  const result = await db.prepare(`
    INSERT INTO requests (request_number, requested_by, department_id, request_type,
                          asset_type, justification,
                          service_asset_id, service_reason,
                          requester_name, requester_employee_id, requester_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(request_number, userId, user?.department_id ?? null, request_type,
         asset.asset_type, service_reason,
         service_asset_id, service_reason,
         requester_name, requester_employee_id, requester_phone);

  const requestId = result.insertId;
  await db.prepare(`INSERT INTO approvals (request_id, step) VALUES (?, 'IM Service Processing')`).run(requestId);

  if (defectPhoto && defectPhoto.size > 0) {
    const filename = await saveDefectPhoto(requestId, defectPhoto);
    await db.prepare("UPDATE requests SET defect_photo = ? WHERE id = ?").run(filename, requestId);
  }

  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function processServiceRequest(
  approvalId: number,
  decision: "Approved" | "Rejected",
  comments: string
) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  const db = getDb();
  const approval = await db.prepare(`
    SELECT a.*, r.id as req_id, r.request_type, r.service_asset_id
    FROM approvals a JOIN requests r ON a.request_id = r.id
    WHERE a.id = ? AND a.step = 'IM Service Processing' AND a.status = 'Pending'
  `).get(approvalId) as any;

  if (!approval) return { error: "Not found or already processed" };

  await withTransaction(async (tx) => {
    await tx.run(`
      UPDATE approvals SET status=?, reviewer_id=?, comments=?, reviewed_at=NOW()
      WHERE id=?
    `, decision, userId, comments || null, approvalId);

    if (decision === "Rejected") {
      await tx.run("UPDATE requests SET status='Rejected', updated_at=NOW() WHERE id=?", approval.req_id);
      return;
    }

    if (approval.request_type === "Return") {
      await tx.run("UPDATE assets SET status='Returned', department_id=NULL, issued_date=NULL, end_of_life_date=NULL, updated_at=NOW() WHERE id=?", approval.service_asset_id);
      await tx.run("UPDATE requests SET status='Returned', updated_at=NOW() WHERE id=?", approval.req_id);
    } else if (approval.request_type === "Repair") {
      await tx.run("UPDATE assets SET status='Maintenance', updated_at=NOW() WHERE id=?", approval.service_asset_id);
      await tx.run("UPDATE requests SET status='Under Repair', updated_at=NOW() WHERE id=?", approval.req_id);
    }
  });

  if (decision === "Approved") {
    if (approval.request_type === "Return") {
      await recordAssetEvent(approval.service_asset_id, "Returned", userId, comments || "Returned to inventory");
    } else if (approval.request_type === "Repair") {
      await recordAssetEvent(approval.service_asset_id, "Sent for Maintenance", userId, comments || "Under repair");
    }
  }

  revalidatePath("/", "layout");
}

export async function createExternalIssuanceRequest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { errors: { _: ["Unauthorized"] } };

  const db = getDb();
  const issue_to_type = (formData.get("issue_to_type") as string)?.trim();
  const issue_to_org_name = (formData.get("issue_to_org_name") as string)?.trim();
  const asset_type = (formData.get("asset_type") as string)?.trim();
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const justification = (formData.get("justification") as string)?.trim();
  const contact_person = (formData.get("contact_person") as string)?.trim() || null;
  const contact_phone = (formData.get("contact_phone") as string)?.trim() || null;

  if (!issue_to_type || !["NGO", "School"].includes(issue_to_type))
    return { errors: { issue_to_type: ["Please select NGO or School"] } };
  if (!issue_to_org_name) return { errors: { issue_to_org_name: ["Organisation name is required"] } };
  if (!asset_type) return { errors: { asset_type: ["Asset type is required"] } };
  if (!justification) return { errors: { justification: ["Purpose / justification is required"] } };

  const request_number = await generateRequestNumber(db);

  const result = await db.prepare(`
    INSERT INTO requests (request_number, requested_by, request_type, asset_type, quantity, justification,
                          issue_to_type, issue_to_org_name,
                          requester_name, requester_phone,
                          status)
    VALUES (?, ?, 'External Issuance', ?, ?, ?, ?, ?, ?, ?, 'IM Review')
  `).run(request_number, userId, asset_type, quantity, justification,
         issue_to_type, issue_to_org_name,
         contact_person, contact_phone);

  const requestId = result.insertId;
  await db.prepare(`INSERT INTO approvals (request_id, step) VALUES (?, 'JIO Approval')`).run(requestId);

  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function createCondemnationRequest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const { id: userId, role, departmentId } = await getCurrentUser();

  const db = getDb();
  const asset_id_str = (formData.get("asset_id") as string)?.trim();
  const condemnation_reason = (formData.get("condemnation_reason") as string)?.trim();
  const justification = (formData.get("justification") as string)?.trim();
  const data_sanitized = formData.get("data_sanitized") === "1" ? 1 : 0;

  if (!asset_id_str) return { errors: { asset_id: ["Asset is required"] } };
  if (!condemnation_reason) return { errors: { condemnation_reason: ["Reason is required"] } };
  if (!justification) return { errors: { justification: ["Justification is required"] } };
  if (!data_sanitized) return { errors: { data_sanitized: ["Data sanitization must be confirmed"] } };

  const defectPhoto = formData.get("defect_photo") as File | null;
  const photoError = validateDefectPhoto(defectPhoto);
  if (photoError) return { errors: photoError };

  const isIM = role === "INVENTORY_MANAGER";
  // Dept users can only request condemnation for an asset actually assigned to their own
  // department — IM can request it for anything not already condemned.
  const asset = isIM
    ? await db.prepare("SELECT * FROM assets WHERE id = ? AND status != 'Condemned'").get(parseInt(asset_id_str)) as any
    : await db.prepare("SELECT * FROM assets WHERE id = ? AND status = 'Assigned' AND department_id = ?").get(parseInt(asset_id_str), departmentId) as any;
  if (!asset) return { errors: { asset_id: ["Asset not found, already condemned, or not assigned to your department"] } };

  const request_number = await generateRequestNumber(db);

  // IM-initiated condemnation skips straight to JIO Approval (the IM already vetted it
  // by creating the request); a worker/dept-user-initiated one goes through IM Initial
  // Review first, same as any other request they submit.
  const status = isIM ? "IM Review" : "Pending";
  const firstStep = isIM ? "JIO Approval" : "IM Initial Review";

  const result = await db.prepare(`
    INSERT INTO requests (request_number, requested_by, request_type, asset_type,
                          justification, condemnation_reason, data_sanitized,
                          service_asset_id, status)
    VALUES (?, ?, 'Condemnation', ?, ?, ?, ?, ?, ?)
  `).run(request_number, userId, asset.asset_type, justification,
         condemnation_reason, data_sanitized, asset.id, status);

  const requestId = result.insertId;
  await db.prepare(`INSERT INTO approvals (request_id, step) VALUES (?, ?)`).run(requestId, firstStep);

  if (defectPhoto && defectPhoto.size > 0) {
    const filename = await saveDefectPhoto(requestId, defectPhoto);
    await db.prepare("UPDATE requests SET defect_photo = ? WHERE id = ?").run(filename, requestId);
  }

  revalidatePath("/", "layout");
  redirect("/requests");
}

export async function cancelRequest(id: number) {
  const { userId } = await verifySession();
  const db = getDb();
  const req = await db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as any;
  if (!req || req.requested_by !== userId) return;
  if (req.status !== "Pending") return;
  await db.prepare("UPDATE requests SET status = 'Rejected', updated_at = NOW() WHERE id = ?").run(id);
  revalidatePath("/", "layout");
}

export async function deleteRequest(id: number) {
  const { userId, role } = await verifySession();
  const db = getDb();
  const req = await db.prepare("SELECT * FROM requests WHERE id = ?").get(id) as any;
  if (!req) return;
  if (req.status !== "Pending") return;
  if (role !== "INVENTORY_MANAGER" && req.requested_by !== userId) return;

  await withTransaction(async (tx) => {
    await tx.run("DELETE FROM request_items WHERE request_id = ?", id);
    await tx.run("DELETE FROM approvals WHERE request_id = ?", id);
    await tx.run("DELETE FROM requests WHERE id = ?", id);
  });

  revalidatePath("/", "layout");
}
