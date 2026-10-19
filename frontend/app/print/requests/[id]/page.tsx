import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { PrintTrigger } from "../PrintTrigger";

export default async function PrintSingleRequestPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const db = getDb();

  const request = await db.prepare(`
    SELECT r.*, d.name as department_name, u.name as requested_by_name
    FROM requests r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN users u ON r.requested_by = u.id
    WHERE r.id = ?
  `).get(parseInt(id)) as any;

  if (!request) notFound();

  const items = await db.prepare(`
    SELECT * FROM request_items WHERE request_id = ? ORDER BY id ASC
  `).all(parseInt(id)) as any[];

  const printedAt = new Date();

  return (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif", padding: "16px", color: "#111", maxWidth: "800px", margin: "0 auto" }}>
      {/* Pins the sheet to a single A4 page — the letter is meant to be printed, signed
          by hand, and scanned back in as one page, so the layout below is kept compact
          enough (tighter margins than a typical multi-page document) to fit within it. */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <PrintTrigger />

      {/* Header */}
      <div style={{ marginBottom: "12px", borderBottom: "2px solid #333", paddingBottom: "8px", textAlign: "center" }}>
        <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>IT Asset Requisition</h1>
        <p style={{ fontSize: "12px", color: "#555", margin: "4px 0 0" }}>
          Request #: <strong>{request.request_number}</strong>
        </p>
        <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>
          Printed on: {printedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
          {" at "}
          {printedAt.toLocaleTimeString("en-IN")}
        </p>
      </div>

      {/* Request details */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "12px" }}>
        <tbody>
          {[
            ["Worker Name", request.requester_name ?? request.requested_by_name ?? "—"],
            ["Office ID Number", request.requester_employee_id ?? "—"],
            ["Designation", request.requester_designation ?? "—"],
            ["Phone", request.requester_phone ?? "—"],
            ["Email", request.requester_email ?? "—"],
            ["Department", request.department_name ?? "—"],
            ["Request Type", request.request_type],
            ["Status", request.status],
            ["Date Submitted", formatDate(request.created_at)],
          ].map(([label, value]) => (
            <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px", fontWeight: "600", width: "35%", color: "#444" }}>{label}</td>
              <td style={{ padding: "4px 8px" }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Requested items */}
      {items.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Requested Items</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ backgroundColor: "#1e3a5f", color: "white" }}>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>#</th>
                <th style={{ padding: "4px 8px", textAlign: "left" }}>Asset Type</th>
                <th style={{ padding: "4px 8px", textAlign: "center" }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f5f7fa" }}>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #e0e0e0" }}>{i + 1}</td>
                  <td style={{ padding: "3px 8px", borderBottom: "1px solid #e0e0e0" }}>{it.asset_type}</td>
                  <td style={{ padding: "3px 8px", textAlign: "center", borderBottom: "1px solid #e0e0e0" }}>{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Justification */}
      <div style={{ marginBottom: "14px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Justification</h3>
        <p style={{ fontSize: "11px", color: "#333", border: "1px solid #e0e0e0", borderRadius: "4px", padding: "8px", minHeight: "28px" }}>
          {request.justification}
        </p>
      </div>

      {request.im_notes && (
        <div style={{ marginBottom: "14px" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>IM Notes</h3>
          <p style={{ fontSize: "11px", color: "#333" }}>{request.im_notes}</p>
        </div>
      )}

      {/* Decision of competent authority */}
      <div style={{ marginTop: "16px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
        <h3 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>Decision of Competent Authority</h3>
        <div style={{ display: "flex", gap: "32px", marginBottom: "10px" }}>
          {["Approved", "Rejected", "On Hold"].map((option) => (
            <div key={option} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "14px",
                  height: "14px",
                  border: "1.5px solid #333",
                  verticalAlign: "middle",
                }}
              />
              <span style={{ fontSize: "12px", color: "#333" }}>{option}</span>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "#666", margin: "0 0 4px" }}>Remarks:</p>
          <div style={{ borderBottom: "1px solid #999", height: "16px" }} />
          <div style={{ borderBottom: "1px solid #999", height: "16px", marginTop: "4px" }} />
        </div>
      </div>

      {/* Signature block for competent authority */}
      <div style={{ marginTop: "12px", paddingTop: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", verticalAlign: "top", paddingRight: "20px" }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px", marginTop: "20px" }}>
                  <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>Signature of Competent Authority</p>
                </div>
              </td>
              <td style={{ width: "50%", verticalAlign: "top" }}>
                <div style={{ borderTop: "1px solid #333", paddingTop: "6px", marginTop: "20px" }}>
                  <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
                    Date: {printedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "14px" }}>
                <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>Name: _______________________________</p>
              </td>
              <td style={{ paddingTop: "14px" }}>
                <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>Order / Reference No.: {request.request_number}</p>
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "10px" }} colSpan={2}>
                <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>Designation: _______________________________</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "14px", fontSize: "10px", color: "#888", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
        IT-Asset · Requisition #{request.request_number} · Printed by {user.name}
      </div>
    </div>
  );
}
