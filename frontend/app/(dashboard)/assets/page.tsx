import Link from "next/link";
import { Plus, Search, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssetRowActions } from "@/components/ui/AssetRowActions";
import { Monitor } from "lucide-react";
import type { AssetStatus, IctCategory } from "@/lib/types";
import { PrintTrigger } from "@/app/print/requests/PrintTrigger";
import { ASSET_TYPE_CATEGORY, ASSET_TYPES } from "@/lib/types";

const CATEGORY_COLORS: Record<IctCategory, string> = {
  I:   "bg-purple-100 text-purple-700",
  II:  "bg-blue-100 text-blue-700",
  III: "bg-amber-100 text-amber-700",
  IV:  "bg-teal-100 text-teal-700",
};

export default async function AssetsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  const sp = await props.searchParams;
  const db = getDb();
  const isDeptUser = user.role === "DEPT_USER";

  const q = sp.q ?? "";
  const status = sp.status ?? "";
  const type = sp.type ?? "";
  const print = sp.print === "1";
  const page = parseInt(sp.page ?? "1");
  const limit = print ? 9999 : 20;
  const offset = print ? 0 : (page - 1) * limit;

  const SORT_OPTIONS: Record<string, { label: string; orderBy: string }> = {
    newest:     { label: "Newest first",        orderBy: "a.created_at DESC" },
    department: { label: "Department (A–Z)",    orderBy: "d.name IS NULL, d.name ASC, a.created_at DESC" },
    asset_id:   { label: "Asset ID",             orderBy: "a.asset_id ASC" },
    status:     { label: "Status",               orderBy: "a.status ASC, a.created_at DESC" },
    type:       { label: "Type",                 orderBy: "a.asset_type ASC, a.created_at DESC" },
  };
  const sort = SORT_OPTIONS[sp.sort ?? ""] ? sp.sort : "newest";

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (isDeptUser) {
    // Department heads only see assets actually assigned to their own department —
    // not the full org-wide inventory (available stock, other departments' assets, etc.)
    where += " AND a.department_id = ? AND a.status = 'Assigned'";
    params.push(user.departmentId);
  } else if (status) {
    where += " AND a.status = ?"; params.push(status);
  }
  if (type) { where += " AND a.asset_type = ?"; params.push(type); }
  if (q) {
    where += " AND (a.asset_id LIKE ? OR a.asset_type LIKE ? OR a.specifications LIKE ? OR a.description LIKE ? OR r.assigned_to_name LIKE ? OR r.requester_name LIKE ? OR d.name LIKE ?)";
    const qp = `%${q}%`;
    params.push(qp, qp, qp, qp, qp, qp, qp);
  }

  // Joined so the search box can also match the employee an asset is currently issued to
  // (assigned_to_name is set at issuance; requester_name is who the request was raised for).
  // A correlated subquery (not a plain join) picks just the most recent 'Issued' request per
  // asset — an asset can rack up more than one over time (issued, returned, reissued), and a
  // plain join on status='Issued' would double-count the asset once per historical match.
  const requestJoin = `
    LEFT JOIN requests r ON r.id = (
      SELECT r2.id FROM requests r2
      WHERE r2.allocated_asset_id = a.id AND r2.status = 'Issued'
      ORDER BY r2.id DESC LIMIT 1
    )
  `;

  const assets = await db.prepare(`
    SELECT a.*, d.name as department_name, r.assigned_to_name, r.requester_name
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    ${requestJoin}
    ${where} ORDER BY ${SORT_OPTIONS[sort].orderBy} LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const total = (await db.prepare(`
    SELECT COUNT(*) as cnt FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    ${requestJoin}
    ${where}
  `).get(...params) as any).cnt;
  const totalPages = Math.ceil(total / limit);

  const STATUSES: AssetStatus[] = ["Available", "Assigned", "Maintenance", "Returned", "Condemned"];

  if (print) {
    return (
      <div className="p-6 print:p-0">
        <div className="mb-4 print:mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Asset Inventory Report</h1>
          <p className="text-sm text-gray-500">Total: {total} assets · Generated: {new Date().toLocaleString()}</p>
        </div>
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Asset ID</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Serial No.</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Type</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Specifications</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Description</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Department</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">Status</th>
              <th className="border border-gray-300 px-3 py-2 text-left font-medium">End of Life</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="even:bg-gray-50">
                <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{asset.asset_id}</td>
                <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{asset.serial_number ?? "—"}</td>
                <td className="border border-gray-300 px-3 py-2">{asset.asset_type}</td>
                <td className="border border-gray-300 px-3 py-2 text-gray-600">{asset.specifications ?? "—"}</td>
                <td className="border border-gray-300 px-3 py-2 text-gray-600">{asset.description ?? "—"}</td>
                <td className="border border-gray-300 px-3 py-2">{asset.status === "Assigned" ? asset.department_name ?? "—" : ""}</td>
                <td className="border border-gray-300 px-3 py-2">{asset.status}</td>
                <td className="border border-gray-300 px-3 py-2">{asset.end_of_life_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PrintTrigger />
        <div className="print:hidden">
          <Link href="/assets" className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle={isDeptUser ? `${total} assets assigned to your department` : `${total} total assets`}
        actions={
          <div className="flex gap-2">
            <Link href="/assets?print=1" className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">
              <Printer className="h-4 w-4" /> Print
            </Link>
            {user.role === "INVENTORY_MANAGER" && (
              <Link href="/assets/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Add Asset
              </Link>
            )}
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <form className="flex items-center gap-2 flex-1 min-w-64">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by ID, type, specifications, employee name, department..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {!isDeptUser && (
              <select name="status" defaultValue={status} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <select name="type" defaultValue={type} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {[...ASSET_TYPES].sort().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="sort" defaultValue={sort} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(SORT_OPTIONS).map(([key, { label }]) => <option key={key} value={key}>Sort: {label}</option>)}
            </select>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Filter</button>
          </form>
        </div>

        {assets.length === 0 ? (
          <EmptyState icon={Monitor} title="No assets found" description="Try adjusting your filters or add a new asset." actionLabel={user.role === "INVENTORY_MANAGER" ? "Add Asset" : undefined} actionHref="/assets/new" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Asset ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Serial No.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Specifications</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{asset.asset_id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{asset.serial_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{asset.asset_type}</p>
                      {ASSET_TYPE_CATEGORY[asset.asset_type] && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${CATEGORY_COLORS[ASSET_TYPE_CATEGORY[asset.asset_type]]}`}>
                          ICT {ASSET_TYPE_CATEGORY[asset.asset_type]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{asset.specifications ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{asset.description ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.status === "Assigned" ? asset.department_name ?? "—" : ""}</td>
                    <td className="px-4 py-3"><AssetStatusBadge status={asset.status} /></td>
                    <td className="px-4 py-3">
                      {user.role === "INVENTORY_MANAGER" ? (
                        <AssetRowActions id={asset.id} assetId={asset.asset_id} />
                      ) : (
                        <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
                      )}
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
              {page > 1 && <Link href={`?page=${page - 1}&q=${q}&status=${status}&type=${type}&sort=${sort}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Previous</Link>}
              {page < totalPages && <Link href={`?page=${page + 1}&q=${q}&status=${status}&type=${type}&sort=${sort}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
