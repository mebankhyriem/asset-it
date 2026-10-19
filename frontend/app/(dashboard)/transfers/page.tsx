import Link from "next/link";
import { Plus, ArrowRightLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

const STATUS_COLORS: Record<string, string> = {
  Pending:     "bg-yellow-100 text-yellow-700",
  Transferred: "bg-green-100 text-green-700",
  Rejected:    "bg-red-100 text-red-700",
};

const FILTER_STATUSES = ["", "Pending", "Transferred", "Rejected"];

export default async function TransfersPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  const sp = await props.searchParams;
  const db = getDb();

  const status = sp.status ?? "";
  const page = parseInt(sp.page ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = "WHERE r.request_type = 'Transfer'";
  const params: any[] = [];
  if (status) { where += " AND r.status = ?"; params.push(status); }
  // Dept users only see their own transfer requests
  if (user.role === "DEPT_USER") { where += " AND r.requested_by = ?"; params.push(user.id); }

  const transfers = await db.prepare(`
    SELECT r.*,
           a.asset_id as asset_code, a.asset_type as asset_kind,
           fd.name as from_dept_name, td.name as to_dept_name,
           u.name as requested_by_name
    FROM requests r
    JOIN assets a ON r.service_asset_id = a.id
    LEFT JOIN departments fd ON r.department_id = fd.id
    LEFT JOIN departments td ON r.target_dept_id = td.id
    LEFT JOIN users u ON r.requested_by = u.id
    ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  const total = (await db.prepare(`SELECT COUNT(*) as cnt FROM requests r ${where}`).get(...params) as any).cnt;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Asset Transfers"
        subtitle={`${total} transfer request${total !== 1 ? "s" : ""}`}
        actions={
          <Link href="/transfers/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Request Transfer
          </Link>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex gap-2 flex-wrap">
          {FILTER_STATUSES.map((s) => (
            <Link
              key={s || "all"}
              href={`?status=${s}`}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                status === s ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>

        {transfers.length === 0 ? (
          <EmptyState icon={ArrowRightLeft} title="No transfer requests found" description="Submit a request to move an asset between departments." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ref</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Asset</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">From</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">To</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Requested By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{t.request_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.asset_kind}</p>
                      <p className="font-mono text-xs text-gray-400">{t.asset_code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.from_dept_name ?? <span className="italic text-gray-400">Unassigned</span>}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{t.to_dept_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.requested_by_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/requests/${t.id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
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
              {page > 1 && <Link href={`?page=${page - 1}&status=${status}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Previous</Link>}
              {page < totalPages && <Link href={`?page=${page + 1}&status=${status}`} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
