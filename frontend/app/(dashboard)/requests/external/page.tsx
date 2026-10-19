"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createExternalIssuanceRequest } from "@/app/actions/requests";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetTypeSelect } from "@/components/ui/AssetTypeSelect";

export default function ExternalIssuancePage() {
  const [state, action, isPending] = useActionState(createExternalIssuanceRequest, undefined);
  const e = state?.errors ?? {};

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Issue Asset to NGO / School"
        subtitle="Submit an external issuance request for JIO and SIO approval"
      />

      <form action={action} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        {/* Organisation Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
            Organisation Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Organisation Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["NGO", "School"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-purple-300 transition-colors has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50"
                  >
                    <input type="radio" name="issue_to_type" value={type} required className="accent-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {type === "NGO" ? "NGO (Non-Governmental Org)" : "Educational School / Institution"}
                    </span>
                  </label>
                ))}
              </div>
              {e.issue_to_type && <p className="text-xs text-red-600 mt-1">{e.issue_to_type[0]}</p>}
            </div>

            <Input
              label="Organisation Name"
              name="issue_to_org_name"
              placeholder="Full name of the NGO or school"
              required
              error={e.issue_to_org_name?.[0]}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contact Person (optional)"
                name="contact_person"
                placeholder="Name of contact at org"
              />
              <Input
                label="Contact Phone (optional)"
                name="contact_phone"
                placeholder="Phone number"
              />
            </div>
          </div>
        </div>

        {/* Asset Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
            Asset Details
          </h3>
          <div className="space-y-4">
            <AssetTypeSelect required error={e.asset_type?.[0]} />

            <Input
              label="Quantity"
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              required
            />

            <Textarea
              label="Purpose / Justification"
              name="justification"
              placeholder="Describe the purpose of this issuance and why it is being approved..."
              rows={4}
              required
              error={e.justification?.[0]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isPending={isPending}>Submit for Approval</Button>
          <Link href="/requests"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
