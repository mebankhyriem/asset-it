import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { PrintTrigger } from "./PrintTrigger";

export default async function PrintRequestsPage() {
  const user = await getCurrentUser();
  const db = getDb();

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (user.role === "DEPT_USER") {
    where += " AND r.requested_by = ?";
    params.push(user.id);
  }

  const requests = await db.prepare(`
    SELECT r.*, d.name as department_name, u.name as requested_by_name,
           a.asset_id as allocated_asset_code, a.end_of_life_date as asset_eol_date
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN assets a ON r.allocated_asset_id = a.id
    ${where} ORDER BY r.created_at DESC
  `).all(...params) as any[];

  return (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif", padding: "24px", color: "#111" }}>
      <PrintTrigger />

      {/* Header */}
      <div style={{ marginBottom: "16px", borderBottom: "2px solid #333", paddingBottom: "10px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>Requisitions Report</h1>
        <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>
          Total: {requests.length} records &nbsp;·&nbsp; Generated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1e3a5f", color: "white" }}>
            {["Request #", "Worker Name", "Office ID No.", "Designation", "Department", "Asset Type", "Qty", "Status", "Date", "Asset ID", "End of Life"].map((h) => (
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: "600", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => (
            <tr key={req.id} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f5f7fa" }}>
              <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "10px", borderBottom: "1px solid #e0e0e0" }}>{req.request_number}</td>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #e0e0e0" }}>{req.requester_name ?? req.requested_by_name}</td>
              <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "10px", borderBottom: "1px solid #e0e0e0" }}>{req.requester_employee_id ?? "—"}</td>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #e0e0e0" }}>{req.requester_designation ?? "—"}</td>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #e0e0e0" }}>{req.department_name ?? "—"}</td>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #e0e0e0" }}>{req.asset_type}</td>
              <td style={{ padding: "5px 8px", textAlign: "center", borderBottom: "1px solid #e0e0e0" }}>{req.quantity}</td>
              <td style={{ padding: "5px 8px", borderBottom: "1px solid #e0e0e0" }}>{req.status}</td>
              <td style={{ padding: "5px 8px", whiteSpace: "nowrap", borderBottom: "1px solid #e0e0e0" }}>{formatDate(req.created_at)}</td>
              <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: "10px", whiteSpace: "nowrap", borderBottom: "1px solid #e0e0e0" }}>{req.allocated_asset_code ?? "—"}</td>
              <td style={{ padding: "5px 8px", whiteSpace: "nowrap", borderBottom: "1px solid #e0e0e0" }}>{req.asset_eol_date ? formatDate(req.asset_eol_date) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "16px", fontSize: "11px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "8px" }}>
        IT-Asset · Requisitions Report · Printed by {user.name}
      </div>
    </div>
  );
}
