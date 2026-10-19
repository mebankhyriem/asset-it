"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { createTransfer } from "@/app/actions/transfers";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Search, X, User } from "lucide-react";

export default function NewTransferPage() {
  const [state, action, isPending] = useActionState(createTransfer, undefined);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  // Step 1: which department the employee belongs to
  const [deptId, setDeptId] = useState("");

  // Step 2: search + pick the employee
  const [empQuery, setEmpQuery] = useState("");
  const [empResults, setEmpResults] = useState<{ name: string; type: string; count: number }[]>([]);
  const [selectedEmpName, setSelectedEmpName] = useState<string | null>(null);

  // Step 3: assets currently assigned to that employee
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, []);

  // Reset downstream selections whenever the department changes
  useEffect(() => {
    setEmpQuery(""); setEmpResults([]); setSelectedEmpName(null); setAssetResults([]); setSelected(null);
  }, [deptId]);

  // Search employees with active assignments in the chosen department
  useEffect(() => {
    if (!deptId || empQuery.length < 2) { setEmpResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/assignments?status=Active&department_id=${deptId}&q=${encodeURIComponent(empQuery)}&limit=100`)
        .then((r) => r.json())
        .then((d) => {
          const rows = d.assignments ?? [];
          const byName = new Map<string, { name: string; type: string; count: number }>();
          for (const row of rows) {
            const existing = byName.get(row.assigned_to_name);
            if (existing) existing.count += 1;
            else byName.set(row.assigned_to_name, { name: row.assigned_to_name, type: row.assigned_to_type, count: 1 });
          }
          setEmpResults([...byName.values()]);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [deptId, empQuery]);

  // Load the assets currently assigned to the selected employee
  useEffect(() => {
    if (!deptId || !selectedEmpName) { setAssetResults([]); return; }
    fetch(`/api/assignments?status=Active&department_id=${deptId}&assigned_to_name=${encodeURIComponent(selectedEmpName)}&limit=100`)
      .then((r) => r.json())
      .then((d) => setAssetResults(d.assignments ?? []));
  }, [deptId, selectedEmpName]);

  function selectEmployee(name: string) {
    setSelectedEmpName(name);
    setEmpQuery("");
    setEmpResults([]);
    setSelected(null);
  }

  function clearEmployee() {
    setSelectedEmpName(null);
    setAssetResults([]);
    setSelected(null);
  }

  const err = (field: string) => state?.errors?.[field]?.[0];

  return (
    <div>
      <PageHeader title="Request Transfer" subtitle="Move an employee's assigned asset to a different room or department" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        {state?.message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{state.message}</div>
        )}

        <form action={action} className="space-y-5">
          {/* Step 1: department */}
          <Select
            label="Employee's Department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            placeholder="Select department..."
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
          />

          {/* Step 2: employee search */}
          {deptId && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Employee <span className="text-red-500">*</span>
              </label>
              {!selectedEmpName ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={empQuery}
                    onChange={(e) => setEmpQuery(e.target.value)}
                    placeholder="Search employee by name..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {empResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {empResults.map((emp) => (
                        <button
                          key={emp.name}
                          type="button"
                          onClick={() => selectEmployee(emp.name)}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-900">{emp.name}</span>
                          <span className="text-gray-400 ml-2 text-xs">{emp.type}</span>
                          <span className="text-gray-400 ml-2 text-xs">· {emp.count} asset{emp.count !== 1 ? "s" : ""} assigned</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {empQuery.length >= 2 && empResults.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No employee with active assignments matches &ldquo;{empQuery}&rdquo; in this department.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-blue-900">{selectedEmpName}</span>
                  </div>
                  <button type="button" onClick={clearEmployee} className="text-blue-400 hover:text-blue-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: assets assigned to the employee */}
          {selectedEmpName && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Asset to Transfer <span className="text-red-500">*</span>
              </label>
              {!selected ? (
                assetResults.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {assetResults.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setSelected(a)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm"
                      >
                        <span className="font-mono font-medium text-blue-700">{a.asset_asset_id}</span>
                        <span className="text-gray-600 ml-2">{a.asset_name}</span>
                        <span className="text-gray-400 ml-2 text-xs">· Room {a.asset_room_number ?? "—"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No assets are currently assigned to {selectedEmpName} in this department.</p>
                )
              ) : (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                  <div className="text-sm">
                    <span className="font-mono font-medium text-blue-700">{selected.asset_asset_id}</span>
                    <span className="text-gray-600 ml-2">{selected.asset_name}</span>
                    <span className="text-gray-400 ml-2 text-xs">
                      · Currently: {selected.asset_department_name ?? "—"}, Room {selected.asset_room_number ?? "—"}
                    </span>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-blue-400 hover:text-blue-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {selected && <input type="hidden" name="asset_id" value={selected.asset_id} />}
              {err("asset_id") && <p className="text-xs text-red-600">{err("asset_id")}</p>}
            </div>
          )}

          {/* Step 4: from room -> to room, and destination department */}
          {selected && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="From Room No."
                  value={selected.asset_room_number ?? "—"}
                  disabled
                />
                <Input
                  label="To Room No."
                  name="target_room_number"
                  required
                  placeholder="e.g. Room 204"
                  error={err("target_room_number")}
                />
              </div>

              <Select
                key={selected.id}
                label="Transfer To Department"
                name="target_dept_id"
                required
                defaultValue={selected.asset_department_id ?? ""}
                placeholder="Select target department..."
                options={departments.map((d) => ({ value: d.id, label: d.name }))}
                error={err("target_dept_id")}
              />

              {/* Reason */}
              <Textarea
                label="Reason / Justification"
                name="reason"
                required
                placeholder="Why is this asset being transferred?"
                rows={3}
              />

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" isPending={isPending}>Submit Transfer Request</Button>
                <Link href="/transfers"><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </>
          )}

          {!selected && (
            <div className="flex items-center gap-3 pt-2">
              <Link href="/transfers"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
