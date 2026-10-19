"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { updateAsset, deleteAsset } from "@/app/actions/assets";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetTypeSelect } from "@/components/ui/AssetTypeSelect";
import { Trash2 } from "lucide-react";

export default function EditAssetPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [asset, setAsset] = useState<any>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const boundUpdateAsset = updateAsset.bind(null, parseInt(id));
  const [state, action, isPending] = useActionState(boundUpdateAsset, undefined);

  useEffect(() => {
    fetch(`/api/assets/${id}`).then((r) => r.json()).then((d) => setAsset(d.asset));
    fetch("/api/departments").then((r) => r.json()).then((d) => setDepartments(d.departments ?? []));
  }, [id]);

  if (!asset) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const err = (field: string) => state?.errors?.[field]?.[0];

  return (
    <div>
      <PageHeader title="Edit Asset" subtitle={asset.asset_id} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form action={action} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Asset ID" name="asset_id" required defaultValue={asset.asset_id} error={err("asset_id")} />
            <Input label="Serial Number" name="serial_number" required defaultValue={asset.serial_number ?? ""} error={err("serial_number")} />
          </div>

          <Input label="MAC Address (optional)" name="mac_address" defaultValue={asset.mac_address ?? ""} error={err("mac_address")} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AssetTypeSelect required defaultValue={asset.asset_type} error={err("asset_type")} />
            <Select
              label="Status"
              name="status"
              required
              options={[
                { value: "Available",   label: "Available" },
                { value: "Assigned",    label: "Assigned" },
                { value: "Maintenance", label: "Maintenance" },
                { value: "Returned",    label: "Returned" },
                { value: "Condemned",   label: "Condemned" },
              ]}
              defaultValue={asset.status}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Department"
              name="department_id"
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Select department (optional)"
              defaultValue={asset.department_id ?? ""}
            />
            <Input label="Room Number (optional)" name="room_number" placeholder="e.g. Room 204" defaultValue={asset.room_number ?? ""} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Issued Date (optional)" name="issued_date" type="date" defaultValue={asset.issued_date ?? ""} />
            <Input label="End of Life Date (optional)" name="end_of_life_date" type="date" defaultValue={asset.end_of_life_date ?? ""} />
          </div>

          <Textarea label="Specifications" name="specifications" required defaultValue={asset.specifications ?? ""} error={err("specifications")} />
          <Textarea label="Description (optional)" name="description" defaultValue={asset.description ?? ""} />

          {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" isPending={isPending}>Save Changes</Button>
            <Link href={`/assets/${id}`}><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>

        {/* Delete section */}
        {asset.status === "Available" && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Danger Zone</p>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Delete Asset
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Are you sure?</p>
              <p className="text-xs text-red-600 mb-3">
                This will permanently delete <strong>{asset.asset_id}</strong> and all its history. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <form action={deleteAsset.bind(null, parseInt(id))}>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                    Yes, Delete Permanently
                  </button>
                </form>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
