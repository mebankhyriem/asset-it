"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { createServiceRequest } from "@/app/actions/requests";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { RotateCcw, Wrench, Camera } from "lucide-react";

export default function ServiceRequestPage() {
  const [state, action, isPending] = useActionState(createServiceRequest, undefined);
  const [requestType, setRequestType] = useState<"Return" | "Repair">("Return");
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/assets?status=Assigned&limit=200")
      .then((r) => r.json())
      .then((d) => setAssets(d.assets ?? []));
  }, []);

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="Return / Repair Request" subtitle="Submit a return or repair request for an assigned asset" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form action={action} className="space-y-5">

          {/* Request Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Request Type</label>
            <input type="hidden" name="request_type" value={requestType} />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRequestType("Return")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${requestType === "Return" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
              >
                <RotateCcw className={`h-5 w-5 ${requestType === "Return" ? "text-blue-600" : "text-gray-400"}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${requestType === "Return" ? "text-blue-700" : "text-gray-700"}`}>Return Asset</p>
                  <p className="text-xs text-gray-500">Asset goes back to inventory</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRequestType("Repair")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${requestType === "Repair" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}
              >
                <Wrench className={`h-5 w-5 ${requestType === "Repair" ? "text-orange-600" : "text-gray-400"}`} />
                <div className="text-left">
                  <p className={`text-sm font-medium ${requestType === "Repair" ? "text-orange-700" : "text-gray-700"}`}>Request Repair</p>
                  <p className="text-xs text-gray-500">Asset sent for maintenance</p>
                </div>
              </button>
            </div>
          </div>

          {/* Worker Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">Worker Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Employee Name" name="requester_name" required placeholder="Full name of the worker" error={err("requester_name")} />
              <Input label="Office ID Number" name="requester_employee_id" placeholder="e.g. OFC-010" error={err("requester_employee_id")} />
              <Input label="Phone Number" name="requester_phone" type="tel" required placeholder="e.g. +91-9876543210" error={err("requester_phone")} className="sm:col-span-2" />
            </div>
          </div>

          {/* Asset Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">Select Asset</h3>
            <input type="hidden" name="service_asset_id" value={selectedAssetId ?? ""} />
            <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {assets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No assigned assets found</p>
              ) : assets.map((asset) => (
                <label
                  key={asset.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAssetId === asset.id ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-blue-200 hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="_asset_radio"
                    checked={selectedAssetId === asset.id}
                    onChange={() => setSelectedAssetId(asset.id)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{asset.asset_id} — {asset.asset_type}</p>
                    <p className="text-xs text-gray-500">
                      {asset.serial_number ? `S/N: ${asset.serial_number} · ` : ""}{asset.department_name ?? "No dept"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {err("service_asset_id") && <p className="text-xs text-red-600 mt-1">{err("service_asset_id")}</p>}
          </div>

          {/* Reason */}
          <Textarea
            label={requestType === "Return" ? "Reason for Return" : "Issue Description"}
            name="service_reason"
            required
            rows={3}
            placeholder={requestType === "Return" ? "Why is this asset being returned?" : "Describe the problem or damage..."}
            error={err("service_reason")}
          />

          {/* Defect photo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Photo of Defect (optional)</label>
            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm
              ${photoFile ? "border-green-400 bg-green-50 text-green-800" : "border-gray-300 bg-white text-gray-600 hover:border-blue-300"}`}>
              <Camera className="h-4 w-4 shrink-0" />
              <span className="truncate">{photoFile ? photoFile.name : "Choose a photo (JPG, PNG, or WEBP)..."}</span>
              <input
                type="file"
                name="defect_photo"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {err("defect_photo") && <p className="text-xs text-red-600 mt-1">{err("defect_photo")}</p>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isPending={isPending}
              className={requestType === "Repair" ? "bg-orange-600 hover:bg-orange-700" : ""}>
              Submit {requestType} Request
            </Button>
            <Link href="/requests"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
