"use client";

import { useActionState, useEffect, useState } from "react";
import { logMaintenance } from "@/app/actions/maintenance";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const MAINTENANCE_TYPES = ["Preventive", "Corrective", "Inspection", "Upgrade"];

export default function NewMaintenancePage() {
  const [state, action, isPending] = useActionState(logMaintenance, undefined);
  const searchParams = useSearchParams();
  const preselectedAsset = searchParams.get("asset_id") ?? "";
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/assets?limit=200").then((r) => r.json()).then((d) => setAssets(d.assets ?? []));
  }, []);

  const err = (f: string) => state?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="Log Maintenance" subtitle="Record a maintenance or repair event for an asset" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-3xl">
        <form action={action} className="space-y-6">
          <Select
            label="Asset"
            name="asset_id"
            required
            options={assets.map((a) => ({ value: a.id, label: `${a.asset_id} — ${a.name} (${a.status})` }))}
            placeholder="Select asset"
            defaultValue={preselectedAsset}
            error={err("asset_id")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Maintenance Type"
              name="maintenance_type"
              required
              options={MAINTENANCE_TYPES.map((t) => ({ value: t, label: t }))}
              defaultValue="Corrective"
            />
            <Input label="Vendor / Technician" name="vendor_name" placeholder="Company or person name" />
            <Input label="Vendor Contact" name="vendor_contact" placeholder="Phone or email" />
            <Input label="Estimated Cost ($)" name="estimated_cost" type="number" step="0.01" placeholder="0.00" />
            <Input label="Start Date" name="started_at" type="date" />
            <Input label="Next Service Date" name="next_service_date" type="date" />
          </div>
          <Textarea label="Description" name="description" required error={err("description")} placeholder="Describe what maintenance or repair is needed..." rows={4} />

          <div className="flex gap-3">
            <Button type="submit" isPending={isPending}>Log Maintenance</Button>
            <Link href="/maintenance"><Button type="button" variant="outline">Cancel</Button></Link>
          </div>
        </form>
      </div>
    </div>
  );
}
