import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROLE_STEPS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  const db = getDb();

  const steps = ROLE_STEPS[user.role] ?? [];

  if (steps.length === 0) {
    return (
      <div>
        <PageHeader title="Approvals" subtitle="Manage approval requests" />
        <EmptyState icon={CheckSquare} title="No approval access" description="Your role does not have approval responsibilities." />
      </div>
    );
  }

  const placeholders = steps.map(() => "?").join(", ");
  const approvals = await db.prepare(`
    SELECT a.*, r.request_number, r.asset_type, r.quantity,
           r.status as req_status, r.justification,
           u.name as requested_by_name, r.created_at as req_created_at,
           d.name as department_name
    FROM approvals a
    JOIN requests r ON a.request_id = r.id
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN departments d ON r.department_id = d.id
    WHERE a.step IN (${placeholders}) AND a.status = 'Pending'
    ORDER BY a.created_at ASC
  `).all(...steps) as any[];

  const stepColor: Record<string, string> = {
    "IM Initial Review": "bg-yellow-100 text-yellow-700",
    "JIO Approval": "bg-indigo-100 text-indigo-700",
    "SIO Approval": "bg-purple-100 text-purple-700",
    "IM Final Processing": "bg-green-100 text-green-700",
  };

  return (
    <div>
      <PageHeader
        title="Pending Approvals"
        subtitle={`${approvals.length} item${approvals.length !== 1 ? "s" : ""} awaiting your review`}
      />

      {approvals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <EmptyState icon={CheckSquare} title="All caught up!" description="No pending approvals for your role." />
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div key={approval.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link href={`/requests/${approval.request_id}`} className="font-mono text-sm font-medium text-blue-600 hover:text-blue-700">
                      {approval.request_number}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepColor[approval.step] ?? "bg-gray-100 text-gray-700"}`}>
                      {approval.step}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{approval.asset_type} × {approval.quantity}</p>
                  <p className="text-xs text-gray-500 mt-0.5">By: {approval.requested_by_name} · Dept: {approval.department_name ?? "—"}</p>
                  <p className="text-xs text-gray-600 mt-2 italic line-clamp-2">"{approval.justification}"</p>
                  <p className="text-xs text-gray-400 mt-1">Submitted {formatDateTime(approval.req_created_at)}</p>
                </div>
                <Link
                  href={`/approvals/${approval.id}`}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
