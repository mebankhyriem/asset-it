import Link from "next/link";
import { Plus, Users, Pencil, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { deleteEmployee } from "@/app/actions/employees";

export default async function EmployeesPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  if (!["INVENTORY_MANAGER", "DEPT_USER"].includes(user.role)) redirect("/dashboard");

  const sp = await props.searchParams;
  const q = sp.q ?? "";
  const db = getDb();

  const employees = q
    ? await db.prepare(`
        SELECT e.*, d.name as department_name
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.name LIKE ? OR e.employee_id LIKE ? OR e.designation LIKE ?
        ORDER BY e.name
      `).all(`%${q}%`, `%${q}%`, `%${q}%`) as any[]
    : await db.prepare(`
        SELECT e.*, d.name as department_name
        FROM employees e LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY e.name
      `).all() as any[];

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employee${employees.length !== 1 ? "s" : ""} on record`}
        actions={
          <Link href="/employees/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Employee
          </Link>
        }
      />

      {/* Search */}
      <form className="mb-4 flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, ID, or designation..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
        {q && <Link href="/employees" className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50">Clear</Link>}
      </form>

      {employees.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No employees yet</p>
          <p className="text-sm text-gray-400 mb-4">Add employees to quickly fill in worker details when submitting requests.</p>
          <Link href="/employees/new" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Add Employee →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Office ID Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Designation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{emp.employee_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.designation ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.department_name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{emp.email ?? "—"}</td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <Link href={`/employees/${emp.id}/edit`} className="text-gray-400 hover:text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <form action={async () => { "use server"; await deleteEmployee(emp.id); }}>
                      <button type="submit" className="text-gray-400 hover:text-red-500 text-xs">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
