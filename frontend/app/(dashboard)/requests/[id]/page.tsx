import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileCheck, Camera } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestStatusBadge } from "@/components/ui/Badge";
import { ApprovalTimeline } from "@/components/ui/ApprovalTimeline";
import { formatDate, formatDateTime } from "@/lib/format";
import { cancelRequest } from "@/app/actions/requests";
import type { Approval } from "@/lib/types";

export default async function RequestDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const db = getDb();

  const request = await db.prepare(`
    SELECT r.*,
           d.name as department_name,
           u.name as requested_by_name,
           u.employee_id as requested_by_empid,
           u.email as requested_by_email,
           ta.asset_id as tentative_asset_code,
           ta.asset_type as tentative_asset_type,
           ta.serial_number as tentative_serial,
           aa.asset_id as allocated_asset_code,
           aa.asset_type as allocated_asset_type,
           aa.serial_number as allocated_serial,
           aa.mac_address as allocated_mac_address,
           aa.end_of_life_date as asset_eol_date
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN assets ta ON r.tentative_asset_id = ta.id
    LEFT JOIN assets aa ON r.allocated_asset_id = aa.id
    WHERE r.id = ?
  `).get(parseInt(id)) as any;

  if (!request) notFound();

  const approvals = await db.prepare(`
    SELECT a.*, u.name as reviewer_name FROM approvals a
    LEFT JOIN users u ON a.reviewer_id = u.id WHERE a.request_id = ? ORDER BY a.created_at ASC
  `).all(parseInt(id)) as Approval[];

  const items = await db.prepare(`
    SELECT ri.*, a.asset_id as allocated_asset_code, a.serial_number as allocated_serial
    FROM request_items ri LEFT JOIN assets a ON ri.allocated_asset_id = a.id
    WHERE ri.request_id = ? ORDER BY ri.id ASC
  `).all(parseInt(id)) as any[];

  const canCancel = user.id === request.requested_by && request.status === "Pending";

  return (
    <div>
      <div className="mb-4">
        <Link href="/requests" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Link>
      </div>

      <PageHeader
        title={request.request_number}
        subtitle={`Submitted on ${formatDate(request.created_at)} by ${request.requested_by_name}`}
        actions={
          <div className="flex items-center gap-3">
            <RequestStatusBadge status={request.status} />
            {canCancel && (
              <form action={async () => { "use server"; await cancelRequest(parseInt(id)); }}>
                <button type="submit" className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-100">Cancel</button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Request Details</h3>
              {request.request_type === "External Issuance" && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">External Issuance</span>
              )}
              {request.request_type === "Transfer" && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Asset Transfer</span>
              )}
            </div>

            {request.request_type === "External Issuance" ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {([
                  ["Organisation Type", request.issue_to_type ?? "—"],
                  ["Organisation Name", request.issue_to_org_name ?? "—"],
                  ["Contact Person", request.requester_name ?? "—"],
                  ["Contact Phone", request.requester_phone ?? "—"],
                  ["Asset Type", request.asset_type],
                  ["Quantity", String(request.quantity)],
                  ["Submitted By (IM)", request.requested_by_name],
                  ["Submitted", formatDateTime(request.created_at)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {([
                  ["Employee Name", request.requester_name ?? request.requested_by_name],
                  ["Office ID Number", request.requester_employee_id ?? request.requested_by_empid ?? "—"],
                  ["Email", request.requester_email ?? request.requested_by_email ?? "—"],
                  ["Designation", request.requester_designation ?? "—"],
                  ["Phone", request.requester_phone ?? "—"],
                  ["Department", request.department_name ?? "—"],
                  ["Submitted By (Head)", request.requested_by_name],
                  ["Asset Type", request.asset_type],
                  ["Quantity", String(request.quantity)],
                  ["Submitted", formatDateTime(request.created_at)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-500">{label}</dt>
                    <dd className="font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Requested Items</p>
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-700">{i + 1}. {item.asset_type} × {item.quantity}</span>
                      {item.allocated_asset_code ? (
                        <span className="text-xs font-mono text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          {item.allocated_asset_code}{item.allocated_serial ? ` · ${item.allocated_serial}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">
                {request.request_type === "External Issuance" ? "Purpose" : "Justification"}
              </p>
              <p className="text-sm text-gray-700">{request.justification}</p>
            </div>
          </div>

          {/* IM Initial Check info */}
          {(request.tentative_asset_code || request.im_notes || request.bypass_signed_file) && (
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3">IM Initial Check</h3>
              {request.im_notes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{request.im_notes}</p>
                </div>
              )}
              {request.tentative_asset_code && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Tentative Asset ID</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {request.tentative_asset_code}
                  </p>
                </div>
              )}
              {request.bypass_signed_file && ["INVENTORY_MANAGER", "JIO", "SIO"].includes(user.role) && (
                <a
                  href={`/api/requests/${request.id}/signed-document`}
                  target="_blank"
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                >
                  <FileCheck className="h-3.5 w-3.5" /> View Signed Document (Physical Signature)
                </a>
              )}
            </div>
          )}

          {/* Defect photo evidence (Return/Repair/Condemnation) */}
          {request.defect_photo && (user.id === request.requested_by || ["INVENTORY_MANAGER", "JIO", "SIO"].includes(user.role)) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Photo Evidence</h3>
              <a
                href={`/api/requests/${request.id}/defect-photo`}
                target="_blank"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" /> View Photo
              </a>
            </div>
          )}

          {/* Final Issuance info */}
          {request.allocated_asset_code && (
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Asset Issuance</h3>
                {user.role === "INVENTORY_MANAGER" && (
                  <Link
                    href={`/assets/${request.allocated_asset_id}/edit`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </Link>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Allocated Asset</dt>
                  <dd className="font-medium text-gray-900">{request.allocated_asset_code}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900">{request.allocated_asset_type}</dd>
                </div>
                {request.allocated_serial && (
                  <div>
                    <dt className="text-gray-500">Serial Number</dt>
                    <dd className="font-mono text-sm text-gray-900">{request.allocated_serial}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">MAC Address</dt>
                  <dd className="font-mono text-sm text-gray-900">{request.allocated_mac_address ?? "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Issued To</dt>
                  <dd className="font-medium text-gray-900">
                    {request.issue_to_type && request.issue_to_type !== "Internal"
                      ? `${request.issue_to_type}: ${request.issue_to_org_name ?? "—"}`
                      : (request.assigned_to_name ?? "—")}
                  </dd>
                </div>
                {request.issue_to_type && request.issue_to_type !== "Internal" && (
                  <div>
                    <dt className="text-gray-500">Organisation Type</dt>
                    <dd className="font-medium text-gray-900">{request.issue_to_type}</dd>
                  </div>
                )}
                {request.allocation_date && (
                  <div>
                    <dt className="text-gray-500">Issue Date</dt>
                    <dd className="font-medium text-gray-900">{formatDate(request.allocation_date)}</dd>
                  </div>
                )}
                {request.asset_eol_date && (
                  <div>
                    <dt className="text-gray-500">End of Life</dt>
                    <dd className="font-medium text-gray-900">{formatDate(request.asset_eol_date)}</dd>
                  </div>
                )}
                {request.condition_on_issue && (
                  <div>
                    <dt className="text-gray-500">Condition</dt>
                    <dd className="font-medium text-gray-900">{request.condition_on_issue}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Acknowledged</dt>
                  <dd className={`font-medium ${request.acknowledged ? "text-green-700" : "text-gray-400"}`}>
                    {request.acknowledged ? "Yes" : "Not yet"}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Approval Workflow</h3>
            <ApprovalTimeline approvals={approvals} currentStatus={request.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
