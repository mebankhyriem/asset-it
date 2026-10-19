"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

const REPORT_TYPES = [
  { value: "utilization", label: "Asset Utilization" },
  { value: "department", label: "Department Allocation" },
  { value: "external", label: "External Allocations" },
  { value: "requests", label: "Request & Approval Log" },
  { value: "maintenance", label: "Maintenance Summary" },
];

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState("utilization");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchReport = async () => {
    setLoading(true);
    const params = new URLSearchParams({ type: reportType });
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    const res = await fetch(`/api/reports?${params}`);
    const json = await res.json();
    setData(json.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [reportType]);

  const columns = data.length ? Object.keys(data[0]) : [];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate and export system reports" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {reportType === "requests" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}

          <Button onClick={fetchReport} variant="primary" size="sm">
            <BarChart3 className="h-4 w-4 mr-1" /> Generate
          </Button>
          {data.length > 0 && (
            <Button
              onClick={() => downloadCSV(data, `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`)}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Generating report...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No data found</p>
            <p className="text-xs text-gray-400 mt-1">Adjust filters and generate the report</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {columns.map((col) => (
                    <th key={col} className="text-left px-4 py-3 font-medium text-gray-600 capitalize">
                      {col.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-gray-700">
                        {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
              {data.length} record{data.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
