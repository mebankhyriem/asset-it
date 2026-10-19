"use client";

import { useActionState } from "react";
import { Recycle } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const DISPOSAL_METHODS = [
  { value: "GeM Auction", label: "GeM Auction (Government e-Marketplace)" },
  { value: "Open Tender", label: "Open Tender" },
  { value: "e-Auction via MSTC", label: "e-Auction via MSTC" },
  { value: "Authorised e-Waste Recycler", label: "Authorised e-Waste Recycler (CPCB/SPCB registered)" },
  { value: "Other Authorised Method", label: "Other Authorised Method" },
];

export function DisposalForm({ assetId, action }: { assetId: number; action: any }) {
  const [state, formAction, isPending] = useActionState(action, undefined as any);
  const err = (f: string) => (state as any)?.errors?.[f]?.[0];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Recycle className="h-5 w-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Record E-Waste Disposal</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        As per Section 11 of IT Asset Management Policy — disposal must be via GeM, open tender, or a CPCB/SPCB registered recycler.
      </p>

      {state?.errors?._ && <p className="text-sm text-red-600 mb-3">{state.errors._[0]}</p>}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="asset_id" value={assetId} />

        <Select
          label="Disposal Method (optional)"
          name="disposal_method"
          options={DISPOSAL_METHODS}
          placeholder="Select method..."
          error={err("disposal_method")}
        />
        <Input
          label="Recycler / Auction House Name (optional)"
          name="disposal_recycler"
          placeholder="e.g. XYZ Recyclers Pvt. Ltd."
          error={err("disposal_recycler")}
        />
        <Input
          label="Tender / Reference Number (optional)"
          name="disposal_reference"
          placeholder="e.g. GEM/2024/B/1234567"
          error={err("disposal_reference")}
        />

        <Button type="submit" isPending={isPending} className="bg-gray-700 hover:bg-gray-800">
          <Recycle className="h-4 w-4" /> Confirm Disposal
        </Button>
      </form>
    </div>
  );
}
