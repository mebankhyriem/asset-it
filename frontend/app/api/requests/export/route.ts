import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const db = getDb();
  const sp = request.nextUrl.searchParams;

  const status = sp.get("status") ?? "";
  const assetType = sp.get("asset_type") ?? "";
  const q = sp.get("q") ?? "";
  const dateFrom = sp.get("date_from") ?? "";
  const dateTo = sp.get("date_to") ?? "";

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (user.role === "DEPT_USER") { where += " AND r.requested_by = ?"; params.push(user.id); }
  if (status)    { where += " AND r.status = ?";     params.push(status); }
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
    ${where} ORDER BY r.created_at DESC
  `).all(...params) as any[];

  const headers = ["Request #", "Worker Name", "Office ID Number", "Department", "Asset Type", "Qty", "Status", "Date", "Asset ID", "End of Life"];
  const rows = requests.map((r) => [
    r.request_number,
    r.requester_name ?? r.requested_by_name ?? "",
    r.requester_employee_id ?? "",
    r.department_name ?? "",
    r.asset_type,
    r.quantity,
    r.status,
    r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
    r.allocated_asset_code ?? "",
    r.asset_eol_date ? new Date(r.asset_eol_date).toISOString().split("T")[0] : "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="requisitions-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
