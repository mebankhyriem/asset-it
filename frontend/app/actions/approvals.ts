"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { verifySession } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { withTransaction } from "@/lib/db/transaction";
import { ROLE_STEPS, CATEGORY_LIFESPAN_YEARS } from "@/lib/types";
import { recordAssetEvent } from "@/lib/history";
import { assetIdWithSerial } from "@/lib/utils";

const SIGNED_UPLOADS_DIR = path.join(process.cwd(), "data", "uploads", "signed-requests");
const ALLOWED_SIGNED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

async function saveSignedDocument(requestId: number, file: File): Promise<string> {
  await mkdir(SIGNED_UPLOADS_DIR, { recursive: true });
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `req-${requestId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(SIGNED_UPLOADS_DIR, filename), buffer);
  return filename;
}

// ─── Step 1: Inventory Manager Initial Check ─────────────────────────────────
// "Bypassed" lets the IM attach proof that the request was printed and signed
// off-system by the competent authority (see /print/requests/[id]) before it was
// scanned and uploaded — but every request still goes on to JIO for digital
// approval afterward. Nothing skips JIO/SIO; this only records that a physical
// signature already exists alongside the digital one.
export async function processIMInitialReview(
  approvalId: number,
  decision: "Approved" | "On Hold" | "Bypassed",
  tentativeAssetId: number | null,
  notes: string,
  bypassReference?: string,
  signedDocument?: File | null,
  isEmergency: boolean = false,
  verbalApproval?: boolean | null,
  verbalApprovalReason?: string
) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  if (decision === "Bypassed") {
    if (!signedDocument || signedDocument.size === 0) {
      return { error: "Upload the signed document before bypassing approval" };
    }
    if (!ALLOWED_SIGNED_FILE_TYPES.includes(signedDocument.type)) {
      return { error: "Signed document must be a PDF or image (JPG, PNG, WEBP)" };
    }
    if (signedDocument.size > 10 * 1024 * 1024) {
      return { error: "Signed document must be under 10MB" };
    }
  }

  const db = getDb();
  const approval = await db.prepare(`
    SELECT a.*, r.id as req_id
    FROM approvals a JOIN requests r ON a.request_id = r.id
    WHERE a.id = ? AND a.step = 'IM Initial Review' AND a.status = 'Pending'
  `).get(approvalId) as any;

  if (!approval) return { error: "Approval step not found or already processed" };

  if (decision === "On Hold") {
    await db.prepare(`
      UPDATE requests SET status='On Hold', im_notes=?, updated_at=NOW() WHERE id=?
    `).run(notes || null, approval.req_id);
    revalidatePath("/", "layout");
    return;
  }

  // File writes are async and shouldn't happen while holding a transaction connection,
  // so save the signed document first and just reference its filename in the transaction.
  const signedFilename = decision === "Bypassed" && signedDocument
    ? await saveSignedDocument(approval.req_id, signedDocument)
    : null;

  await withTransaction(async (tx) => {
    const storedStatus = decision === "Bypassed" ? "Approved" : decision;
    await tx.run(`
      UPDATE approvals SET status=?, reviewer_id=?, comments=?, reviewed_at=NOW()
      WHERE id=?
    `, storedStatus, userId, notes || null, approvalId);

    // Transfer: IM is the only approver — move asset immediately on approval
    const req = await tx.prepare("SELECT request_type, service_asset_id, target_dept_id, target_room_number, department_id FROM requests WHERE id = ?").get(approval.req_id) as any;
    if (req?.request_type === "Transfer") {
      const fromAsset = await tx.prepare("SELECT room_number FROM assets WHERE id = ?").get(req.service_asset_id) as any;
      await tx.run("UPDATE assets SET department_id=?, room_number=?, updated_at=NOW() WHERE id=?",
        req.target_dept_id, req.target_room_number, req.service_asset_id);
      await tx.run(`
        INSERT INTO asset_transfers (asset_id, from_dept_id, to_dept_id, from_room_number, to_room_number, status, initiated_by, confirmed_by, confirmed_at)
        VALUES (?, ?, ?, ?, ?, 'Completed', ?, ?, NOW())
      `, req.service_asset_id, req.department_id, req.target_dept_id, fromAsset?.room_number ?? null, req.target_room_number, userId, userId);
      await tx.run("UPDATE requests SET status='Transferred', updated_at=NOW() WHERE id=?", approval.req_id);
      return;
    }

    if (decision === "Bypassed") {
      await tx.run(`
        UPDATE requests SET status='Forwarded', tentative_asset_id=?, im_notes=?,
          is_emergency=?, verbal_approval=?, verbal_approval_reason=?,
          bypass_approved=1, bypass_reference=?, bypass_signed_file=?, updated_at=NOW()
        WHERE id=?
      `, tentativeAssetId ?? null, notes || null,
        isEmergency ? 1 : 0, verbalApproval === undefined || verbalApproval === null ? null : (verbalApproval ? 1 : 0), verbalApprovalReason?.trim() || null,
        bypassReference?.trim() || null, signedFilename, approval.req_id);

      await tx.run("INSERT INTO approvals (request_id, step) VALUES (?, 'JIO Approval')", approval.req_id);
      return;
    }

    await tx.run(`
      UPDATE requests SET status='IM Review', tentative_asset_id=?, im_notes=?,
        is_emergency=?, verbal_approval=?, verbal_approval_reason=?, updated_at=NOW()
      WHERE id=?
    `, tentativeAssetId ?? null, notes || null,
      isEmergency ? 1 : 0, verbalApproval === undefined || verbalApproval === null ? null : (verbalApproval ? 1 : 0), verbalApprovalReason?.trim() || null,
      approval.req_id);

    await tx.run("INSERT INTO approvals (request_id, step) VALUES (?, 'JIO Approval')", approval.req_id);
  });

  // Record audit event for approved transfers
  if (decision === "Approved") {
    const req = await db.prepare("SELECT request_type, service_asset_id, target_dept_id, target_room_number FROM requests WHERE id = ?").get(approval.req_id) as any;
    if (req?.request_type === "Transfer") {
      const toDept = await db.prepare("SELECT name FROM departments WHERE id = ?").get(req.target_dept_id) as any;
      await recordAssetEvent(req.service_asset_id, "Transferred", userId, `Moved to: ${toDept?.name ?? "Unknown"}, Room ${req.target_room_number ?? "—"}`);
    }
  }

  revalidatePath("/", "layout");
}

// ─── Step 2 & 3: JIO and SIO Approval ────────────────────────────────────────
// A single approval (by either JIO or SIO) is enough to finalize a request.
// JIO may approve outright (final) or forward it to SIO for the final call.
// SIO approval is always final — there is nowhere left to forward to.
export async function processApproval(
  approvalId: number,
  decision: "Approved" | "Rejected" | "Forwarded",
  comments: string
) {
  const { userId, role } = await verifySession();
  const db = getDb();

  const approval = await db.prepare(`
    SELECT a.*, r.id as req_id, r.status as req_status
    FROM approvals a JOIN requests r ON a.request_id = r.id
    WHERE a.id = ? AND a.status = 'Pending'
  `).get(approvalId) as any;

  if (!approval) return { error: "Approval not found" };

  const allowedSteps = ROLE_STEPS[role] ?? [];
  if (!allowedSteps.includes(approval.step)) return { error: "Unauthorized for this step" };

  if (decision === "Forwarded" && approval.step !== "JIO Approval") {
    return { error: "Only a JIO approval can be forwarded" };
  }

  await withTransaction(async (tx) => {
    // Forwarding still counts as JIO's approval of the request — just not the final word.
    const storedStatus = decision === "Forwarded" ? "Approved" : decision;
    await tx.run(`
      UPDATE approvals SET status=?, reviewer_id=?, comments=?, reviewed_at=NOW()
      WHERE id=?
    `, storedStatus, userId, comments || null, approvalId);

    if (decision === "Rejected") {
      await tx.run("UPDATE requests SET status='Rejected', updated_at=NOW() WHERE id=?", approval.req_id);
      return;
    }

    if (approval.step === "JIO Approval") {
      await tx.run("UPDATE requests SET status='JIO Approved', updated_at=NOW() WHERE id=?", approval.req_id);
      if (decision === "Forwarded") {
        await tx.run("INSERT INTO approvals (request_id, step) VALUES (?, 'SIO Approval')", approval.req_id);
      } else {
        // JIO approved directly — final decision, skip SIO entirely.
        await tx.run("INSERT INTO approvals (request_id, step) VALUES (?, 'IM Final Processing')", approval.req_id);
      }
    } else if (approval.step === "SIO Approval") {
      await tx.run("UPDATE requests SET status='SIO Approved', updated_at=NOW() WHERE id=?", approval.req_id);
      await tx.run("INSERT INTO approvals (request_id, step) VALUES (?, 'IM Final Processing')", approval.req_id);
    }
  });

  revalidatePath("/", "layout");
}

// ─── Step 4: Inventory Manager Final Processing ───────────────────────────────
export async function issueAsset(
  approvalId: number,
  assignedToName: string,
  conditionOnIssue: string,
  endOfLifeDate: string,
  acknowledged: boolean,
  itemAllocations: Record<number, number[]>,
  serialNumbers: Record<number, string> = {},
  specifications: Record<number, string> = {},
  macAddresses: Record<number, string> = {}
) {
  const { userId, role } = await verifySession();
  if (role !== "INVENTORY_MANAGER") return { error: "Unauthorized" };

  const db = getDb();

  const approval = await db.prepare(`
    SELECT a.*, r.id as req_id, r.department_id, r.request_type, r.service_asset_id, r.request_number
    FROM approvals a JOIN requests r ON a.request_id = r.id
    WHERE a.id = ? AND a.step = 'IM Final Processing' AND a.status = 'Pending'
  `).get(approvalId) as any;

  if (!approval) return { error: "Final processing step not found or already done" };

  // If a tentative asset was linked during IM Initial Review, it's the only asset of that
  // type allowed to be assigned here — the UI already restricts selection to it, but that
  // restriction is enforced again here in case the request was tampered with in transit.
  const reqRow = await db.prepare("SELECT tentative_asset_id FROM requests WHERE id = ?").get(approval.req_id) as any;
  if (reqRow?.tentative_asset_id) {
    const tentativeAsset = await db.prepare("SELECT asset_type FROM assets WHERE id = ?").get(reqRow.tentative_asset_id) as any;
    if (tentativeAsset) {
      for (const [itemIdStr, assetIds] of Object.entries(itemAllocations)) {
        const item = await db.prepare("SELECT asset_type FROM request_items WHERE id = ?").get(parseInt(itemIdStr)) as any;
        if (item?.asset_type === tentativeAsset.asset_type && assetIds.some((aid) => aid !== reqRow.tentative_asset_id)) {
          return { error: "Only the tentative asset selected during initial review can be assigned for this item." };
        }
      }
    }
  }

  // Validate any serial numbers entered at issuance time — no duplicates in this batch,
  // and none already registered to a different asset. The asset's own ID (assigned at
  // creation, e.g. DSK-2026-004) never changes here — serial number is a separate,
  // independently-unique identifier.
  const seenSerials = new Map<string, string>();
  for (const [aidStr, snRaw] of Object.entries(serialNumbers)) {
    const sn = snRaw?.trim();
    if (!sn) continue;
    if (seenSerials.has(sn)) return { error: `Serial number "${sn}" was entered more than once` };
    seenSerials.set(sn, aidStr);
    const conflict = await db.prepare("SELECT id FROM assets WHERE serial_number = ? AND id != ?").get(sn, parseInt(aidStr));
    if (conflict) return { error: `Serial number "${sn}" is already registered to another asset` };
  }

  // ── Condemnation path ────────────────────────────────────────────────────
  if (approval.request_type === "Condemnation") {
    await withTransaction(async (tx) => {
      await tx.run(`UPDATE approvals SET status='Approved', reviewer_id=?, reviewed_at=NOW() WHERE id=?`,
        userId, approvalId);
      await tx.run(`UPDATE assets SET status='Condemned', updated_at=NOW() WHERE id=?`,
        approval.service_asset_id);
      await tx.run(`UPDATE requests SET status='Condemned', updated_at=NOW() WHERE id=?`,
        approval.req_id);
    });
    await recordAssetEvent(approval.service_asset_id, "Condemned", userId, "Approved for e-waste disposal");
    revalidatePath("/", "layout");
    return;
  }

  // ── Normal issuance path ─────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const allAssetIds = Object.values(itemAllocations).flat();
  const firstAssetId = allAssetIds[0] ?? null;

  // Every asset being issued must have a serial number — either already on record,
  // or supplied now as part of assigning it to the employee. Specifications are
  // optional at this step.
  for (const aid of allAssetIds) {
    const a = await db.prepare("SELECT asset_id, serial_number FROM assets WHERE id = ?").get(aid) as any;
    if (!a) continue;
    const suppliedSerial = (serialNumbers as any)[aid]?.trim() || (serialNumbers as any)[String(aid)]?.trim();
    if (!a.serial_number && !suppliedSerial) {
      return { error: `Enter a serial number for ${a.asset_id} before issuing.` };
    }
  }

  await withTransaction(async (tx) => {
    await tx.run(`UPDATE approvals SET status='Approved', reviewer_id=?, reviewed_at=NOW() WHERE id=?`,
      userId, approvalId);

    // Assign every selected asset
    for (const [itemIdStr, assetIds] of Object.entries(itemAllocations)) {
      for (const aid of assetIds) {
        const a = await tx.prepare("SELECT * FROM assets WHERE id = ? AND status = 'Available'").get(aid) as any;
        if (!a) continue;

        // Determine end-of-life date: explicit value wins; otherwise look up configured policy by asset_type
        let eolToSet: string | null = null;
        if (endOfLifeDate) {
          eolToSet = endOfLifeDate;
        } else {
          const policy = await tx.prepare("SELECT lifespan_years FROM eol_policies WHERE asset_type = ?").get(a.asset_type) as any;
          if (policy && policy.lifespan_years) {
            const e = new Date(today);
            e.setFullYear(e.getFullYear() + policy.lifespan_years);
            eolToSet = e.toISOString().split("T")[0];
          } else {
            // Fallback to ICT category default lifespans
            const cat = a.ict_category as keyof typeof CATEGORY_LIFESPAN_YEARS;
            const years = CATEGORY_LIFESPAN_YEARS[cat] ?? null;
            if (years) {
              const e = new Date(today);
              e.setFullYear(e.getFullYear() + years);
              eolToSet = e.toISOString().split("T")[0];
            }
          }
        }

        const newSerial = (serialNumbers as any)[aid]?.trim() || (serialNumbers as any)[String(aid)]?.trim();
        const newSpec = (specifications as any)[aid]?.trim() || (specifications as any)[String(aid)]?.trim();
        const newMac = (macAddresses as any)[aid]?.trim() || (macAddresses as any)[String(aid)]?.trim();

        // Assets are added with a placeholder sequential ID (e.g. LAP-2026-002) before
        // their serial number is known. The first time a real serial is recorded here,
        // rename the ID to embed it (plus OS/RAM/Processor for Laptop/Desktop/Tablet/
        // Phone) instead — LAP-2026-002 → LAP-2026-Windows-16GB-IntelCorei5-9876 — as
        // long as that ID isn't already taken by another asset.
        let newAssetId: string | null = null;
        if (newSerial && !a.serial_number) {
          const candidate = assetIdWithSerial(a.asset_id, a.asset_type, newSpec || a.specifications, newSerial);
          if (candidate !== a.asset_id) {
            const clash = await tx.prepare("SELECT id FROM assets WHERE asset_id = ? AND id != ?").get(candidate, aid);
            if (!clash) newAssetId = candidate;
          }
        }

        await tx.run(`
          UPDATE assets SET status='Assigned', department_id=?, issued_date=?, end_of_life_date=?,
            serial_number=COALESCE(?, serial_number), specifications=COALESCE(?, specifications),
            mac_address=COALESCE(?, mac_address), asset_id=COALESCE(?, asset_id),
            updated_at=NOW()
          WHERE id=?
        `, approval.department_id ?? a.department_id, today, eolToSet, newSerial || null, newSpec || null, newMac || null, newAssetId, aid);
      }
      // Store the first allocated asset id in request_items for reference
      if (assetIds[0]) {
        await tx.run(`UPDATE request_items SET allocated_asset_id=? WHERE id=?`,
          assetIds[0], parseInt(itemIdStr));
      }
    }

    await tx.run(`UPDATE requests SET status='Issued', allocated_asset_id=?, allocation_date=?, assigned_to_name=?, condition_on_issue=?, acknowledged=?, updated_at=NOW() WHERE id=?`,
      firstAssetId, today, assignedToName || null, conditionOnIssue || null, acknowledged ? 1 : 0, approval.req_id);
  });

  // Record audit history for every assigned asset
  for (const aid of allAssetIds) {
    await recordAssetEvent(aid, "Assigned", userId, `Issued to ${assignedToName || "—"} · Req ${approval.request_number}`);
  }

  revalidatePath("/", "layout");
}
