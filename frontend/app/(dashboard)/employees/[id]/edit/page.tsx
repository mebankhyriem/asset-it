"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { updateEmployee } from "@/app/actions/employees";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default function EditEmployeePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [emp, setEmp] = useState<any>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  const bound = updateEmployee.bind(null, parseInt(id));
  const [state, action, isPending] = useActionState(bound, undefined);

  useEffect(() => {
    fetch(`/api/employees/${id}`).then((r) => r.json()).then((d) => setEmp(d.employee));
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, [id]);

  if (!emp) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="Edit Employee" subtitle={emp.name} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-xl">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Office ID Number" name="employee_id" required defaultValue={emp.employee_id} error={err("employee_id")} />
            <Input label="Full Name" name="name" required defaultValue={emp.name} error={err("name")} />
            <Input label="Designation" name="designation" defaultValue={emp.designation ?? ""} error={err("designation")} />
            <Input label="Phone" name="phone" type="tel" defaultValue={emp.phone ?? ""} error={err("phone")} />
            <Input label="Email" name="email" type="email" defaultValue={emp.email ?? ""} error={err("email")} className="sm:col-span-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="department_id" defaultValue={emp.department_id ?? ""} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select department (optional)</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

          <div className="flex gap-3">
            <Button type="submit" isPending={isPending}>Save Changes</Button>
            <Link href="/employees"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
