"use client";

import { useActionState, useEffect, useState } from "react";
import { createAssignment } from "@/app/actions/assignments";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ASSIGNMENT_TYPES = ["Employee", "Worker", "NGO", "Educational", "Department"];

export default function NewAssignmentPage() {
  const [state, action, isPending] = useActionState(createAssignment, undefined);
  const searchParams = useSearchParams();
  const preselectedAsset = searchParams.get("asset_id") ?? "";

  const [assets, setAssets] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [assignType, setAssignType] = useState("Employee");

  useEffect(() => {
    fetch("/api/assets?status=Available&limit=100").then((r) => r.json()).then((d) => setAssets(d.assets ?? []));
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
    fetch("/api/organizations").then((r) => r.json()).then((d) => setOrganizations(d.organizations ?? []));
  }, []);

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="New Assignment" subtitle="Directly assign an asset to a person or organization" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-3xl">
        <form action={action} className="space-y-6">
          <Select
            label="Asset"
            name="asset_id"
            required
            options={assets.map((a) => ({ value: a.id, label: `${a.asset_id} — ${a.name}` }))}
            placeholder="Select available asset"
            defaultValue={preselectedAsset}
            error={err("asset_id")}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
            <div className="flex flex-wrap gap-2">
              {ASSIGNMENT_TYPES.map((t) => (
                <label key={t} className={`flex items-center px-3 py-1.5 rounded-lg border cursor-pointer text-sm font-medium transition-colors ${assignType === t ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <input type="radio" name="assigned_to_type" value={t} checked={assignType === t} onChange={() => setAssignType(t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Assigned To (Name)" name="assigned_to_name" required error={err("assigned_to_name")} placeholder="Full name" />
            {(assignType === "Employee" || assignType === "Worker" || assignType === "Department") && (
              <Select label="Department" name="department_id" options={departments.map((d) => ({ value: d.id, label: d.name }))} placeholder="Select department" />
            )}
            {(assignType === "NGO" || assignType === "Educational") && (
              <Select label="Organization" name="external_org_id" options={organizations.filter((o) => assignType === "NGO" ? o.type === "NGO" : o.type === "Educational").map((o) => ({ value: o.id, label: o.name }))} placeholder="Select organization" />
            )}
            <Input label="Expected Return Date" name="expected_return_date" type="date" helpText="Leave blank for permanent" />
            <Select label="Condition on Issue" name="condition_on_issue" options={["Excellent","Good","Fair"].map((c) => ({ value: c, label: c }))} placeholder="Select condition" />
          </div>
          <Textarea label="Notes" name="notes" placeholder="Any special instructions..." />

          <div className="flex gap-3">
            <Button type="submit" isPending={isPending}>Create Assignment</Button>
            <Link href="/assignments"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
        </form>
      </div>
    </div>
  );
}
