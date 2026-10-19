"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createEmployee } from "@/app/actions/employees";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewEmployeePage() {
  const [state, action, isPending] = useActionState(createEmployee, undefined);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, []);

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="Add Employee" subtitle="Save employee details for quick selection in requests" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-xl">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Office ID Number" name="employee_id" required placeholder="e.g. OFC-042" error={err("employee_id")} />
            <Input label="Full Name" name="name" required placeholder="Full name" error={err("name")} />
            <Input label="Designation" name="designation" placeholder="e.g. Lab Technician" error={err("designation")} />
            <Input label="Phone" name="phone" type="tel" placeholder="+91-9876543210" error={err("phone")} />
            <Input label="Email" name="email" type="email" placeholder="worker@example.com" error={err("email")} className="sm:col-span-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="department_id" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select department (optional)</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

          <div className="flex gap-3">
            <Button type="submit" isPending={isPending}>Save Employee</Button>
            <Link href="/employees"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
