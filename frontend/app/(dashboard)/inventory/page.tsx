import { getDb } from "@/lib/db/client";
import { getCurrentUser } from "@/lib/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Warehouse } from "lucide-react";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const isDeptUser = user.role === "DEPT_USER";

  // Dept users only see their own department's held assets — not general/unassigned
  // stock (Available) or other departments' inventory. IM/SIO/JIO keep the full,
  // org-wide, all-statuses overview.
  const where = isDeptUser ? "WHERE a.department_id = ? AND a.status != 'Available'" : "WHERE 1=1";
  const params = isDeptUser ? [user.departmentId] : [];

  const categoryStatus = await db.prepare(`
    SELECT a.asset_type as category, a.status, COUNT(*) as count
    FROM assets a ${where} GROUP BY a.asset_type, a.status ORDER BY a.asset_type, a.status
  `).all(...params) as any[];

  const departments = await db.prepare(`
    SELECT d.name as department, a.status, COUNT(*) as count
    FROM assets a LEFT JOIN departments d ON a.department_id = d.id
    ${where} GROUP BY d.name, a.status ORDER BY d.name
  `).all(...params) as any[];

  const totals = await db.prepare(`
    SELECT a.status, COUNT(*) as count FROM assets a ${where} GROUP BY a.status
  `).all(...params) as any[];

  const categories = [...new Set(categoryStatus.map((r) => r.category))];
  const statuses = (isDeptUser
    ? ["Assigned", "Maintenance", "Returned", "Condemned"]
    : ["Available", "Assigned", "Maintenance", "Returned", "Condemned"]);
  const deptNames = [...new Set(departments.map((r) => r.department ?? "Unassigned"))];

  const categoryMap: Record<string, Record<string, number>> = {};
  categoryStatus.forEach((r) => {
    if (!categoryMap[r.category]) categoryMap[r.category] = {};
    categoryMap[r.category][r.status] = r.count;
  });

  const deptMap: Record<string, Record<string, number>> = {};
  departments.forEach((r) => {
    const deptName = r.department ?? "Unassigned";
    if (!deptMap[deptName]) deptMap[deptName] = {};
    deptMap[deptName][r.status] = r.count;
  });

  const totalMap: Record<string, number> = {};
  totals.forEach((r) => { totalMap[r.status] = r.count; });
  const grandTotal = Object.values(totalMap).reduce((a, b) => a + b, 0);

  const statusColors: Record<string, string> = {
    Available: "text-green-700 bg-green-50",
    Assigned: "text-blue-700 bg-blue-50",
    Maintenance: "text-yellow-700 bg-yellow-50",
    Returned: "text-purple-700 bg-purple-50",
    Condemned: "text-red-700 bg-red-50",
  };

  return (
    <div>
      <PageHeader
        title="Inventory Overview"
        subtitle={isDeptUser ? "Assets currently held by your department" : "Real-time stock visibility across all asset categories"}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {statuses.map((s) => (
          <div key={s} className={`rounded-xl border p-4 ${statusColors[s] ?? "bg-gray-50 text-gray-700"}`}>
            <p className="text-2xl font-bold">{totalMap[s] ?? 0}</p>
            <p className="text-sm font-medium mt-0.5">{s}</p>
            <p className="text-xs opacity-70">{grandTotal > 0 ? Math.round(((totalMap[s] ?? 0) / grandTotal) * 100) : 0}% of total</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">By Category</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Category</th>
                  {statuses.map((s) => (
                    <th key={s} className="text-center px-4 py-3 font-medium text-gray-600">{s}</th>
                  ))}
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat) => {
                  const rowTotal = statuses.reduce((acc, s) => acc + (categoryMap[cat]?.[s] ?? 0), 0);
                  return (
                    <tr key={cat} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{cat}</td>
                      {statuses.map((s) => (
                        <td key={s} className="text-center px-4 py-3">
                          <span className={`inline-flex items-center justify-center min-w-6 h-6 rounded-full text-xs font-medium ${categoryMap[cat]?.[s] ? statusColors[s] : "text-gray-300"}`}>
                            {categoryMap[cat]?.[s] ?? 0}
                          </span>
                        </td>
                      ))}
                      <td className="text-center px-4 py-3 font-bold text-gray-900">{rowTotal}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td className="px-5 py-3 font-semibold text-gray-700">Total</td>
                  {statuses.map((s) => (
                    <td key={s} className="text-center px-4 py-3 font-semibold text-gray-700">{totalMap[s] ?? 0}</td>
                  ))}
                  <td className="text-center px-4 py-3 font-bold text-gray-900">{grandTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {!isDeptUser && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">By Department</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Department</th>
                    {statuses.map((s) => (
                      <th key={s} className="text-center px-4 py-3 font-medium text-gray-600">{s}</th>
                    ))}
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deptNames.map((dept) => {
                    const rowTotal = statuses.reduce((acc, s) => acc + (deptMap[dept]?.[s] ?? 0), 0);
                    return (
                      <tr key={dept} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{dept}</td>
                        {statuses.map((s) => (
                          <td key={s} className="text-center px-4 py-3">
                            <span className={`inline-flex items-center justify-center min-w-6 h-6 rounded-full text-xs font-medium ${deptMap[dept]?.[s] ? statusColors[s] : "text-gray-300"}`}>
                              {deptMap[dept]?.[s] ?? 0}
                            </span>
                          </td>
                        ))}
                        <td className="text-center px-4 py-3 font-bold text-gray-900">{rowTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
