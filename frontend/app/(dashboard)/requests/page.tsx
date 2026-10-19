import Link from "next/link";
import { Plus, FileText, Printer, Wrench, Building2, Download, AlertTriangle } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { RequestStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { RequestRowActions } from "@/components/ui/RequestRowActions";
import { EmergencyDocUpload } from "@/components/ui/EmergencyDocUpload";
import { formatDate } from "@/lib/format";
import { ASSET_TYPES } from "@/lib/types";
import type { RequestStatus } from "@/lib/types";

const ALL_STATUSES: RequestStatus[] = ["Pending", "IM Review", "On Hold", "JIO Approved", "SIO Approved", "Issued", "Rejected"];

export default async function RequestsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  const sp = await props.searchParams;
  const db = getDb();

  const status    = sp.status ?? "";
  const assetType = sp.asset_type ?? "";
  const q         = sp.q ?? "";
  const dateFrom  = sp.date_from ?? "";
  const dateTo    = sp.date_to ?? "";
  const page      = parseInt(sp.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (user.role === "DEPT_USER") { where += " AND r.requested_by = ?"; params.push(user.id); }
  if (status === "Emergency") { where += " AND r.is_emergency = 1"; }
  else if (status) { where += " AND r.status = ?"; params.push(status); }
  if (assetType) { where += " AND r.asset_type = ?"; params.push(assetType); }
  if (dateFrom)  { where += " AND date(r.created_at) >= ?"; params.push(dateFrom); }
  if (dateTo)    { where += " AND date(r.created_at) <= ?"; params.push(dateTo); }
  if (q) { where += " AND (r.request_number LIKE ? OR r.asset_type LIKE ? OR r.requester_name LIKE ? OR d.name LIKE ?)"; const qp = `%${q}%`; params.push(qp, qp, qp, qp); }

  const requests = await db.prepare(`
    SELECT r.*, d.name as department_name, u.name as requested_by_name,
           a.asset_id as allocated_asset_code, a.end_of_life_date as asset_eol_date
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN assets a ON r.allocated_asset_id = a.id
    ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const total = (await db.prepare(`
    SELECT COUNT(*) as cnt FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    ${where}
  `).get(...params) as any).cnt;
  const totalPages = Math.ceil(total / limit);

  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (status) exportParams.set("status", status);
  if (assetType) exportParams.set("asset_type", assetType);
  if (dateFrom) exportParams.set("date_from", dateFrom);
  if (dateTo) exportParams.set("date_to", dateTo);
  const exportHref = `/api/requests/export${exportParams.toString() ? `?${exportParams.toString()}` : ""}`;

  return (
    <div>
      <PageHeader
        title="Requisitions"
        subtitle={`${total} total requests`}
        actions={
          <div className="flex gap-2">
            <a href="/print/requests" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
              <Printer className="h-4 w-4" /> Print
            </a>
            <a href={exportHref} className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4" /> Export CSV
            </a>
            <Link href="/requests/service" className="inline-flex items-center gap-2 px-3 py-2 border border-orange-300 text-orange-700 text-sm rounded-lg hover:bg-orange-50">
              <Wrench className="h-4 w-4" /> Return / Repair
            </Link>
            {user.role === "INVENTORY_MANAGER" && (
              <Link href="/requests/external" className="inline-flex items-center gap-2 px-3 py-2 border border-purple-300 text-purple-700 text-sm rounded-lg hover:bg-purple-50">
                <Building2 className="h-4 w-4" /> Issue to NGO / School
              </Link>
            )}
            <Link href="/requests/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" /> New Request
            </Link>
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <form className="flex items-center gap-2 flex-wrap">
            <input name="q" defaultValue={q} placeholder="Search by number, name, type, or department..." className="flex-1 min-w-44 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select name="asset_type" defaultValue={assetType} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Asset Types</option>
              {[...ASSET_TYPES].filter((t) => t !== "Other").sort().concat("Other").map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="status" defaultValue={status} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Statuses</option>
              <option value="Emergency">Emergency Request</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">From</span>
              <input type="date" name="date_from" defaultValue={dateFrom} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">To</span>
              <input type="date" name="date_to" defaultValue={dateTo} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Filter</button>
            {(q || status || assetType || dateFrom || dateTo) && (
              <a href="/requests" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Clear</a>
            )}
          </form>
        </div>

        {requests.length === 0 ? (
          <EmptyState icon={FileText} title="No requests found" description="Submit a new asset requisition." actionLabel="New Request" actionHref="/requests/new" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Request #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Worker Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Asset Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Qty</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Emergency</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Asset ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">End of Life</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{req.request_number}</td>
                    <td className="px-4 py-3 text-gray-900">{req.requester_name ?? req.requested_by_name}</td>
                    <td className="px-4 py-3 text-gray-600">{req.department_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{req.asset_type}</td>
                    <td className="px-4 py-3 text-gray-600">{req.quantity}</td>
                    <td className="px-4 py-3"><RequestStatusBadge status={req.status} /></td>
                    <td className="px-4 py-3">
                      {req.is_emergency ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                            <AlertTriangle className="h-3 w-3" /> Emergency
                          </span>
                          {user.role === "INVENTORY_MANAGER" && (
                            <EmergencyDocUpload requestId={req.id} hasDocument={!!req.emergency_approval_document} />
                          )}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(req.created_at)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{req.allocated_asset_code ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{req.asset_eol_date ? formatDate(req.asset_eol_date) : "—"}</td>
                    <td className="px-4 py-3">
                      <RequestRowActions
                        id={req.id}
                        requestNumber={req.request_number}
                        canDelete={req.status === "Pending" && (user.role === "INVENTORY_MANAGER" || user.id === req.requested_by)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`?page=${page - 1}&q=${q}&status=${status}&asset_type=${assetType}&date_from=${dateFrom}&date_to=${dateTo}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Previous</Link>}
              {page < totalPages && <Link href={`?page=${page + 1}&q=${q}&status=${status}&asset_type=${assetType}&date_from=${dateFrom}&date_to=${dateTo}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
