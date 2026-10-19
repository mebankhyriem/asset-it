import Link from "next/link";
import { Plus, Users, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { UserRowActions } from "@/components/ui/UserRowActions";

export default async function UsersPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  if (user.role !== "INVENTORY_MANAGER") redirect("/dashboard");

  const sp = await props.searchParams;
  const created = sp.created === "1";
  const db = getDb();
  const q = sp.q ?? "";

  let where = "WHERE 1=1";
  const params: any[] = [];
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)"; const qp = `%${q}%`; params.push(qp, qp, qp); }

  const users = await db.prepare(`
    SELECT u.id, u.employee_id, u.name, u.email, u.role, u.is_active, u.created_at,
           d.name as department_name
    FROM users u LEFT JOIN departments d ON u.department_id = d.id
    ${where} ORDER BY u.name
  `).all(...params) as any[];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${users.length} users`}
        actions={
          <Link href="/users/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add User
          </Link>
        }
      />

      {created && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <Mail className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">New user created</p>
            <p className="text-green-700 mt-0.5">The account is active — they'll be asked to set their own password on first login.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <form className="flex gap-3">
            <input name="q" defaultValue={q} placeholder="Search by name, email, or ID..." className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
          </form>
        </div>

        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" actionLabel="Add User" actionHref="/users/new" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Office ID Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{u.employee_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-4 py-3 text-gray-600">{u.department_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <UserRowActions userId={u.id} isActive={u.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
