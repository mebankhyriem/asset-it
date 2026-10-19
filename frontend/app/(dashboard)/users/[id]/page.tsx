"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateUser, deactivateUser, resetUserPassword } from "@/app/actions/users";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { use } from "react";

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const DEPARTMENT_SCOPED_ROLES = ["DEPT_USER"];

export default function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [user, setUser] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isDeactivating, startDeactivating] = useTransition();
  const [role, setRole] = useState("");

  const boundUpdateUser = updateUser.bind(null, parseInt(id));
  const [state, action, isPending] = useActionState(boundUpdateUser, undefined);

  const boundResetPassword = resetUserPassword.bind(null, parseInt(id));
  const [pwState, pwAction, pwPending] = useActionState(boundResetPassword, undefined);

  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then((d) => { setUser(d.user); setRole(d.user?.role ?? ""); });
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, [id]);

  const handleDeactivate = () => {
    startDeactivating(async () => {
      await deactivateUser(parseInt(id));
      fetch(`/api/users/${id}`).then((r) => r.json()).then((d) => setUser(d.user));
    });
  };

  if (!user) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const err = (f: string) => state?.errors?.[f]?.[0];
  const showDepartment = DEPARTMENT_SCOPED_ROLES.includes(role);

  return (
    <div>
      <div className="mb-4">
        <Link href="/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Link>
      </div>

      <PageHeader
        title={user.name}
        subtitle={user.employee_id}
        actions={
          <div className="flex items-center gap-3">
            <RoleBadge role={user.role} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Account Info</h3>
          <dl className="space-y-3 text-sm">
            {([
              ["Office ID Number", user.employee_id],
              ["Email", user.email],
              ["Department", user.department_name ?? "—"],
              ["Created", formatDate(user.created_at)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
          {!!user.is_active && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button onClick={handleDeactivate} isPending={isDeactivating} variant="destructive" size="sm">
                Deactivate Account
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Edit User</h3>
          <form action={action} className="space-y-4">
            <input type="hidden" name="is_active" value={user.is_active ? "1" : "0"} />
            <Input label="Full Name" name="name" required defaultValue={user.name} error={err("name")} />
            <Select label="Role" name="role" required options={ROLES} value={role} onChange={(e) => setRole(e.target.value)} />
            {showDepartment ? (
              <div>
                <Input
                  label="Department"
                  name="department_name"
                  placeholder="e.g. IT Department"
                  helpText="Type a new name to create it, or match an existing one"
                  defaultValue={user.department_name ?? ""}
                  list="department-names"
                />
                <datalist id="department-names">
                  {departments.map((d: any) => <option key={d.id} value={d.name} />)}
                </datalist>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS]} oversees all departments — no single department assignment needed.
              </p>
            )}
            <Button type="submit" isPending={isPending} size="sm">Save Changes</Button>
            {state?.message && <p className="text-sm text-green-600">{state.message}</p>}
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Reset Password</h3>
          <form action={pwAction} className="space-y-4">
            <Input label="New Password" name="new_password" type="password" required placeholder="Min. 6 characters" />
            <Button type="submit" isPending={pwPending} size="sm" variant="outline">Reset Password</Button>
            {pwState?.message && <p className="text-sm text-green-600">{pwState.message}</p>}
            {pwState?.errors?.new_password && <p className="text-sm text-red-600">{pwState.errors.new_password[0]}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
