"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { closeMaintenance } from "@/app/actions/maintenance";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/format";
import { use } from "react";

export default function MaintenanceDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [log, setLog] = useState<any>(null);
  const [actualCost, setActualCost] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch(`/api/maintenance/${id}`).then((r) => r.json()).then((d) => setLog(d.log));
  }, [id]);

  const handleClose = () => {
    startTransition(async () => {
      await closeMaintenance(parseInt(id), actualCost ? parseFloat(actualCost) : null, notes);
      setClosed(true);
      fetch(`/api/maintenance/${id}`).then((r) => r.json()).then((d) => setLog(d.log));
    });
  };

  if (!log) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Maintenance
        </Link>
      </div>

      <PageHeader title="Maintenance Record" subtitle={`${log.asset_name} (${log.asset_asset_id})`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Asset", `${log.asset_name} (${log.asset_asset_id})`],
              ["Category", log.asset_category],
              ["Type", log.maintenance_type],
              ["Status", log.status],
              ["Vendor", log.vendor_name ?? "—"],
              ["Vendor Contact", log.vendor_contact ?? "—"],
              ["Estimated Cost", log.estimated_cost ? `$${log.estimated_cost.toLocaleString()}` : "—"],
              ["Actual Cost", log.actual_cost ? `$${log.actual_cost.toLocaleString()}` : "—"],
              ["Started", formatDate(log.started_at)],
              ["Completed", formatDate(log.completed_at)],
              ["Next Service", formatDate(log.next_service_date)],
              ["Logged By", log.logged_by_name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{log.description}</p>
          </div>
          {log.notes && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{log.notes}</p>
            </div>
          )}
        </div>

        {(log.status === "Open" || log.status === "In Progress") && !closed && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Close Maintenance</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What was done, parts replaced, etc..."
                />
              </div>
              <Button onClick={handleClose} isPending={isPending} className="w-full">Mark as Completed</Button>
            </div>
          </div>
        )}

        {closed && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-5 flex items-center justify-center">
            <p className="text-green-700 font-medium">Maintenance closed — asset is now Available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
