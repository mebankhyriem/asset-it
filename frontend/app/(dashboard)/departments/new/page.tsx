"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createDepartment } from "@/app/actions/departments";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewDepartmentPage() {
  const [state, action, isPending] = useActionState(createDepartment, undefined);

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="Add Department" subtitle="Create a new department" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-md">
        <form action={action} className="space-y-4">
          <Input label="Department Name" name="name" required error={err("name")} placeholder="e.g. Finance, Operations" />

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Employee (optional)</p>
              <p className="text-xs text-gray-500">
                Add the department's employee now — their account is created together with the department, and they'll appear on the Departments page right away.
              </p>
            </div>
            <Input label="Employee Name" name="employee_name" error={err("employee_name")} placeholder="Full name" />
            <Input label="Employee Email" name="employee_email" type="email" error={err("employee_email")} placeholder="user@example.com" />
            <Input
              label="Password"
              name="employee_password"
              type="password"
              error={err("employee_password")}
              placeholder="Min. 6 characters"
              helpText="Employee can change this after login"
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" isPending={isPending}>Create Department</Button>
            <Link href="/departments"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
        </form>
      </div>
    </div>
  );
}
