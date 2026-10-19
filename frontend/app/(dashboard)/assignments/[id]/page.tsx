"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { returnAsset } from "@/app/actions/assignments";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/format";
import { use } from "react";

export default function AssignmentDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [assignment, setAssignment] = useState<any>(null);
  const [condition, setCondition] = useState("Good");
  const [isPending, startTransition] = useTransition();
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    fetch(`/api/assignments/${id}`).then((r) => r.json()).then((d) => setAssignment(d.assignment));
  }, [id]);

  const handleReturn = () => {
    startTransition(async () => {
      await returnAsset(parseInt(id), condition, "");
      setReturned(true);
      fetch(`/api/assignments/${id}`).then((r) => r.json()).then((d) => setAssignment(d.assignment));
    });
  };

  if (!assignment) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="mb-4">
        <Link href="/assignments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Assignments
        </Link>
      </div>

      <PageHeader title="Assignment Details" subtitle={`Asset: ${assignment.asset_asset_id} — ${assignment.asset_name}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Assignment Info</h3>
          <dl className="space-y-3 text-sm">
            {[
              ["Asset", `${assignment.asset_name} (${assignment.asset_asset_id})`],
              ["Assigned To", assignment.assigned_to_name],
              ["Assignment Type", assignment.assigned_to_type],
              ["Department/Org", assignment.department_name ?? assignment.external_org_name ?? "—"],
              ["Issue Date", formatDate(assignment.assigned_date)],
              ["Expected Return", formatDate(assignment.expected_return_date)],
              ["Actual Return", formatDate(assignment.actual_return_date)],
              ["Condition (Issue)", assignment.condition_on_issue ?? "—"],
              ["Condition (Return)", assignment.condition_on_return ?? "—"],
              ["Issued By", assignment.issued_by_name],
              ["Status", assignment.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-900 text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {assignment.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{assignment.notes}</p>
            </div>
          )}
        </div>

        {assignment.status === "Active" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Process Return</h3>
            {returned ? (
              <div className="text-center py-8 text-green-600">
                <p className="font-medium">Asset returned successfully!</p>
                <Link href="/assignments" className="mt-2 text-sm text-blue-600 hover:text-blue-700 block">Back to assignments →</Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Asset Condition on Return</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Excellent", "Good", "Fair", "Poor", "Damaged"].map((c) => (
                      <button key={c} type="button" onClick={() => setCondition(c)}
                        className={`py-2 text-xs font-medium rounded-lg border transition-colors ${condition === c ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleReturn} isPending={isPending} className="w-full">Mark as Returned</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
