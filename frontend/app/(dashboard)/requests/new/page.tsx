"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createRequest } from "@/app/actions/requests";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetTypeSelect } from "@/components/ui/AssetTypeSelect";
import { Plus, Trash2, Search, X } from "lucide-react";

type Item = { id: number; asset_type: string };

export default function NewRequestPage() {
  const [state, action, isPending] = useActionState(createRequest, undefined);
  const [items, setItems] = useState<Item[]>([{ id: 1, asset_type: "" }]);
  const [myDepartment, setMyDepartment] = useState<string | null>(null);
  const [myDepartmentId, setMyDepartmentId] = useState<number | null>(null);
  const [isInventoryManager, setIsInventoryManager] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  // Employee lookup
  const [empQuery, setEmpQuery] = useState("");
  const [empResults, setEmpResults] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      setMyDepartment(d.user?.department_name ?? null);
      setMyDepartmentId(d.user?.department_id ?? null);
      setIsInventoryManager(d.user?.role === "INVENTORY_MANAGER");
    });
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, []);

  useEffect(() => {
    if (empQuery.length < 2) { setEmpResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/employees?q=${encodeURIComponent(empQuery)}`)
        .then((r) => r.json())
        .then((d) => setEmpResults(d.employees ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [empQuery]);

  function selectEmployee(emp: any) {
    setSelectedEmp(emp);
    setEmpQuery("");
    setEmpResults([]);
  }

  function clearEmployee() {
    setSelectedEmp(null);
    setEmpQuery("");
  }

  const err = (field: string) => state?.errors?.[field]?.[0];
  const addItem = () => setItems((prev) => [...prev, { id: Date.now(), asset_type: "" }]);
  const removeItem = (id: number) => setItems((prev) => prev.filter((it) => it.id !== id));

  return (
    <div>
      <PageHeader
        title="New Requisition"
        subtitle={isInventoryManager ? "Submit a request on behalf of any department" : myDepartment ? `Submitting on behalf of ${myDepartment}` : "Submit a request for IT assets"}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form action={action} className="space-y-5">
          <input type="hidden" name="request_type" value="New Asset" />

          {/* Worker Details */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Worker Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select a saved employee or fill in manually.</p>
              </div>
              <Link href="/employees/new" className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add to directory</Link>
            </div>

            {/* Employee search */}
            {!selectedEmp ? (
              <div className="relative mb-4" ref={searchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={empQuery}
                    onChange={(e) => setEmpQuery(e.target.value)}
                    placeholder="Search saved employees by name or ID..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {empResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {empResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => selectEmployee(emp)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{emp.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{emp.employee_id}</span>
                        {emp.designation && <span className="text-gray-400 ml-2 text-xs">· {emp.designation}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
                <div className="text-sm">
                  <span className="font-medium text-blue-900">{selectedEmp.name}</span>
                  <span className="text-blue-600 ml-2 text-xs">{selectedEmp.employee_id}</span>
                  {selectedEmp.designation && <span className="text-blue-500 ml-2 text-xs">· {selectedEmp.designation}</span>}
                </div>
                <button type="button" onClick={clearEmployee} className="text-blue-400 hover:text-blue-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Hidden fields when employee selected, editable when not */}
            {selectedEmp ? (
              <>
                <input type="hidden" name="requester_name" value={selectedEmp.name} />
                <input type="hidden" name="requester_employee_id" value={selectedEmp.employee_id} />
                <input type="hidden" name="requester_email" value={selectedEmp.email ?? ""} />
                <input type="hidden" name="requester_phone" value={selectedEmp.phone ?? ""} />
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-4">
                  <div><span className="text-gray-400">Email:</span> {selectedEmp.email || "—"}</div>
                  <div><span className="text-gray-400">Phone:</span> {selectedEmp.phone || "—"}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    key={selectedEmp.id}
                    label="Department"
                    name="department_id"
                    required
                    defaultValue={selectedEmp.department_id ?? ""}
                    placeholder="Select department"
                    options={departments.map((d) => ({ value: d.id, label: d.name }))}
                    error={err("department_id")}
                  />
                  <Input
                    key={`desig-${selectedEmp.id}`}
                    label="Designation"
                    name="requester_designation"
                    required
                    defaultValue={selectedEmp.designation ?? ""}
                    placeholder="e.g. Lab Technician"
                    error={err("requester_designation")}
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Employee Name" name="requester_name" required placeholder="Full name" error={err("requester_name")} />
                <Input label="Office ID Number" name="requester_employee_id" required placeholder="e.g. OFC-010" error={err("requester_employee_id")} />
                <Input label="Email Address" name="requester_email" type="email" placeholder="worker@example.com" error={err("requester_email")} />
                <Input label="Phone Number" name="requester_phone" type="tel" required placeholder="+91-9876543210" error={err("requester_phone")} />
                <Select
                  label="Department"
                  name="department_id"
                  required
                  defaultValue={myDepartmentId ?? ""}
                  placeholder="Select department"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  error={err("department_id")}
                />
                <Input label="Designation" name="requester_designation" required placeholder="e.g. Lab Technician" error={err("requester_designation")} />
              </div>
            )}
          </div>

          {/* Asset Items */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Requested Items</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add one or more asset types for this worker.</p>
              </div>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-500 mb-1">Item {idx + 1}</p>
                    <AssetTypeSelect required error={idx === 0 ? err("asset_type") : undefined} />
                  </div>
                  <input type="hidden" name="quantity" value="1" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)} className="mt-6 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {items.length > 1 && (
              <p className="text-xs text-blue-600 mt-2">{items.length} item types requested</p>
            )}
          </div>

          {/* Justification */}
          <Textarea
            label="Justification"
            name="justification"
            required
            error={err("justification")}
            placeholder="Explain why these assets are needed..."
            rows={4}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isPending={isPending}>Submit Request</Button>
            <Link href="/requests"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
