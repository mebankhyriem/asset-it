import { CheckCircle, XCircle, Clock, Circle } from "lucide-react";
import type { Approval, ApprovalStep } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const NEW_ASSET_STEPS: ApprovalStep[] = [
  "IM Initial Review",
  "JIO Approval",
  "SIO Approval",
  "IM Final Processing",
];

const SERVICE_STEPS: ApprovalStep[] = ["IM Service Processing"];

const STEP_LABELS: Record<ApprovalStep, string> = {
  "IM Initial Review": "IM Initial Check",
  "JIO Approval": "JIO Approval (Level 1)",
  "SIO Approval": "SIO Approval (Level 2)",
  "IM Final Processing": "IM Final Processing & Issuance",
  "IM Service Processing": "IM Service Processing",
};

interface ApprovalTimelineProps {
  approvals: Approval[];
  currentStatus: string;
}

export function ApprovalTimeline({ approvals, currentStatus }: ApprovalTimelineProps) {
  const isService = approvals.some((a) => a.step === "IM Service Processing");
  const STEPS = isService ? SERVICE_STEPS : NEW_ASSET_STEPS;

  const getStepApproval = (step: ApprovalStep) => approvals.find((a) => a.step === step);

  const getStepState = (step: ApprovalStep) => {
    const approval = getStepApproval(step);
    if (!approval) return "not_started";
    if (approval.status === "Approved") return "approved";
    if (approval.status === "Rejected") return "rejected";
    return "pending";
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {STEPS.map((step, idx) => {
          const state = getStepState(step);
          const approval = getStepApproval(step);
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step}>
              <div className="relative pb-8">
                {!isLast && (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    {state === "approved" && <CheckCircle className="h-8 w-8 text-green-500 bg-white" />}
                    {state === "rejected" && <XCircle className="h-8 w-8 text-red-500 bg-white" />}
                    {state === "pending" && <Clock className="h-8 w-8 text-yellow-500 bg-white" />}
                    {state === "not_started" && <Circle className="h-8 w-8 text-gray-300 bg-white" />}
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{STEP_LABELS[step]}</p>
                      {approval?.reviewer_name && (
                        <p className="text-xs text-gray-500">By: {approval.reviewer_name}</p>
                      )}
                      {approval?.comments && (
                        <p className="mt-1 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 italic">
                          "{approval.comments}"
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          state === "approved" ? "bg-green-100 text-green-700"
                          : state === "rejected" ? "bg-red-100 text-red-700"
                          : state === "pending" ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {state === "not_started" ? "Awaiting" : approval?.status ?? "Pending"}
                      </span>
                      {approval?.reviewed_at && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(approval.reviewed_at)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
