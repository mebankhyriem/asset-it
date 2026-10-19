"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, UserRound, Monitor } from "lucide-react";
import { use } from "react";
import { updateDepartment } from "@/app/actions/departments";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetStatusBadge } from "@/components/ui/Badge";

export default function EditDepartmentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [dept, setDept] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  const boundUpdate = updateDepartment.bind(null, parseInt(id));
  const [state, action, isPending] = useActionState(boundUpdate, undefined);

  useEffect(() => {
    fetch(`/api/departments/${id}`).then((r) => r.json()).then((d) => {
      setDept(d.department);
      setUsers(d.users ?? []);
      setEmployees(d.employees ?? []);
      setAssets(d.assets ?? []);
    });
  }, [id]);

  if (!dept) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <div className="mb-4">
        <Link href="/departments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Departments
        </Link>
      </div>
      <PageHeader title={dept.name} subtitle="Department details" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Edit Department</h3>
            <form action={action} className="space-y-4">
              <Input label="Department Name" name="name" required defaultValue={dept.name} error={err("name")} />
              <div className="flex gap-3">
                <Button type="submit" isPending={isPending}>Save Changes</Button>
              </div>
              {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Users */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Users className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Users ({users.length})</h3>
            </div>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No system users in this department</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <span className="text-gray-400 text-xs">{u.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Employees */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <UserRound className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Employees ({employees.length})</h3>
            </div>
            {employees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No employees on record for this department</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {employees.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{e.name}</p>
                      <p className="text-xs text-gray-400">{e.designation ?? "—"} · {e.employee_id}</p>
                    </div>
                    <span className="text-gray-400 text-xs">{e.phone ?? e.email ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Assets */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Monitor className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Assets ({assets.length})</h3>
            </div>
            {assets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No assets assigned to this department</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {assets.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <Link href={`/assets/${a.id}`} className="font-mono text-xs text-blue-600 hover:text-blue-700">{a.asset_id}</Link>
                      <p className="text-xs text-gray-400 mt-0.5">{a.asset_type}</p>
                    </div>
                    <AssetStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
