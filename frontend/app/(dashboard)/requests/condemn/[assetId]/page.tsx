"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldCheck, Camera } from "lucide-react";
import { createCondemnationRequest } from "@/app/actions/requests";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { use } from "react";

const CONDEMNATION_REASONS = [
  { value: "Beyond Economical Repair (>50% replacement cost)", label: "Beyond Economical Repair (>50% replacement cost)" },
  { value: "End of Life Exceeded", label: "End of Life Exceeded" },
  { value: "Technically Obsolete", label: "Technically Obsolete" },
  { value: "Irreparable Physical Damage", label: "Irreparable Physical Damage" },
  { value: "Data Security Risk", label: "Data Security Risk" },
  { value: "Other", label: "Other" },
];

const SANITIZATION_ITEMS = [
  "All necessary data backed up and backup integrity validated",
  "Backup stored securely and accessible independently of this device",
  "Storage media (HDD/SSD) data fully wiped using industry-standard certified tool",
  "Operating system and software licenses deactivated",
  "Asset removed from domain / network directory",
  "All user data and credentials cleared",
  "Physical identification label removed or defaced",
];

export default function CondemnAssetPage(props: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(props.params);
  const [state, action, isPending] = useActionState(createCondemnationRequest, undefined);
  const [asset, setAsset] = useState<any>(null);
  const [sanitized, setSanitized] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>(SANITIZATION_ITEMS.map(() => false));
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`/api/assets/${assetId}`).then((r) => r.json()).then((d) => setAsset(d.asset));
  }, [assetId]);

  const allChecked = checklist.every(Boolean);
  const err = (f: string) => (state?.errors as any)?.[f]?.[0];

  return (
    <div>
      <div className="mb-4">
        <Link href={`/assets/${assetId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Asset
        </Link>
      </div>

      <PageHeader
        title="Initiate Asset Condemnation"
        subtitle="Submit for JIO → SIO approval before final disposal"
      />

      <div className="max-w-2xl space-y-5">
        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-orange-800">Condemnation is irreversible</p>
            <p className="text-orange-700 mt-0.5">
              Once condemned and approved, the asset will be permanently removed from active inventory
              and marked for e-waste disposal as per Government of Meghalaya IT Asset Policy.
            </p>
          </div>
        </div>

        {/* Asset Info */}
        {asset && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Asset Being Condemned</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ["Asset ID", asset.asset_id],
                ["Type", asset.asset_type],
                ["Status", asset.status],
                ["Department", asset.department_name ?? "—"],
                ["Serial Number", asset.serial_number ?? "—"],
                ["Issue Date", asset.issued_date ?? "—"],
                ["End of Life", asset.end_of_life_date ?? "—"],
                ["ICT Category", asset.ict_category ? `Category ${asset.ict_category}` : "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <form action={action} className="space-y-5">
          <input type="hidden" name="asset_id" value={assetId} />

          {/* Data Sanitization Checklist */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Data Sanitization Checklist</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              All items must be confirmed before condemnation can proceed (as per policy Section 8).
            </p>
            <div className="space-y-3">
              {SANITIZATION_ITEMS.map((item, i) => (
                <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist[i] ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-blue-200"}`}>
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={(e) => {
                      const next = [...checklist];
                      next[i] = e.target.checked;
                      setChecklist(next);
                      setSanitized(next.every(Boolean));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600"
                  />
                  <span className={`text-sm ${checklist[i] ? "text-green-800 line-through opacity-75" : "text-gray-700"}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
            {!allChecked && (
              <p className="text-xs text-amber-600 mt-3">All checklist items must be completed before submitting.</p>
            )}
            <input type="hidden" name="data_sanitized" value={allChecked ? "1" : "0"} />
            {err("data_sanitized") && <p className="text-xs text-red-600 mt-2">{err("data_sanitized")}</p>}
          </div>

          {/* Condemnation Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Condemnation Details</h3>

            <Select
              label="Reason for Condemnation"
              name="condemnation_reason"
              required
              options={CONDEMNATION_REASONS}
              placeholder="Select reason..."
              error={err("condemnation_reason")}
            />

            <Textarea
              label="Justification / Additional Notes"
              name="justification"
              required
              rows={4}
              placeholder="Describe the condition of the asset, repair estimates, or other relevant details..."
              error={err("justification")}
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Photo Evidence (optional)</label>
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
          </div>

          {state?.errors?._ && (
            <p className="text-sm text-red-600">{(state.errors as any)._?.[0]}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              isPending={isPending}
              disabled={!allChecked}
              className={allChecked ? "bg-orange-600 hover:bg-orange-700" : "opacity-50 cursor-not-allowed"}
            >
              Submit for Approval
            </Button>
            <Link href={`/assets/${assetId}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
