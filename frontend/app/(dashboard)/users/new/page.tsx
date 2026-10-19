"use client";

import { useActionState, useEffect, useState } from "react";
import { createUser } from "@/app/actions/users";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ROLE_LABELS } from "@/lib/types";
import Link from "next/link";

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const DEPARTMENT_SCOPED_ROLES = ["DEPT_USER"];

export default function NewUserPage() {
  const [state, action, isPending] = useActionState(createUser, undefined);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [role, setRole] = useState("");

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, []);

  const err = (f: string) => state?.errors?.[f]?.[0];
  const showDepartment = !role || DEPARTMENT_SCOPED_ROLES.includes(role);

  return (
    <div>
      <PageHeader title="Add User" subtitle="Create a new system user account" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" name="name" required error={err("name")} placeholder="Full name" />
            <Input label="Email Address" name="email" type="email" required error={err("email")} placeholder="user@example.com" />
            <Input label="Password" name="password" type="password" required error={err("password")} placeholder="Min. 6 characters" helpText="User can change this after login" />
            <Select
              label="Role"
              name="role"
              required
              options={ROLES}
              placeholder="Select role"
              error={err("role")}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
            {showDepartment && (
              <div>
                <Input
                  label="Department"
                  name="department_name"
                  placeholder="e.g. IT Department"
                  helpText="Type a new name to create it, or match an existing one"
                  list="department-names"
                />
                <datalist id="department-names">
                  {departments.map((d) => <option key={d.id} value={d.name} />)}
                </datalist>
              </div>
            )}
            {!showDepartment && (
              <p className="text-xs text-gray-500 self-center sm:col-span-1">
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS]} oversees all departments — no single department assignment needed.
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" isPending={isPending}>Create User</Button>
            <Link href="/users"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
        </form>
      </div>
    </div>
  );
}
