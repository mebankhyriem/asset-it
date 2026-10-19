"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Package, Trash2, Clock, Forward, Download, AlertTriangle, Printer, Upload, FileCheck, Eye } from "lucide-react";
import { processIMInitialReview, processApproval, issueAsset } from "@/app/actions/approvals";
import { processServiceRequest } from "@/app/actions/requests";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { CATEGORY_LIFESPAN_YEARS, CATEGORY_LABELS } from "@/lib/types";
import type { IctCategory } from "@/lib/types";
import { use } from "react";

const CATEGORY_COLORS: Record<string, string> = {
  I:   "bg-purple-100 text-purple-700",
  II:  "bg-blue-100 text-blue-700",
  III: "bg-amber-100 text-amber-700",
  IV:  "bg-teal-100 text-teal-700",
};

function calcEolDate(issuedDate: string, category: IctCategory): string {
  const d = new Date(issuedDate);
  d.setFullYear(d.getFullYear() + CATEGORY_LIFESPAN_YEARS[category]);
  return d.toISOString().split("T")[0];
}

export default function ApprovalReviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const router = useRouter();
  const [approval, setApproval] = useState<any>(null);
  const [request, setRequest] = useState<any>(null);
  const [requestItems, setRequestItems] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // IM Initial Review state
  const [imNotes, setImNotes] = useState("");
  const [tentativeAssetId, setTentativeAssetId] = useState<number | null>(null);
  const [imDecision, setImDecision] = useState<"Approved" | "On Hold" | "Bypassed" | null>("Approved");
  const [signedDocument, setSignedDocument] = useState<File | null>(null);
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [downloadUploadSelected, setDownloadUploadSelected] = useState(false);
  const [emergencyAnswer, setEmergencyAnswer] = useState<"Yes" | "No" | null>(null);
  const [verbalApproval, setVerbalApproval] = useState<"Yes" | "No" | null>(null);
  const [verbalApprovalReason, setVerbalApprovalReason] = useState("");

  // JIO / SIO state
  const [decision, setDecision] = useState<"Approved" | "Rejected" | "Forwarded" | null>(null);
  const [comments, setComments] = useState("");

  // IM Service Processing state
  const [serviceDecision, setServiceDecision] = useState<"Approved" | "Rejected" | null>(null);
  const [serviceComments, setServiceComments] = useState("");

  // IM Final Processing state — itemAllocations maps itemId -> selected assetId[]
  const [itemAllocations, setItemAllocations] = useState<Record<number, number[]>>({});
  // assetSerials maps assetId -> serial number entered at issuance time
  const [assetSerials, setAssetSerials] = useState<Record<number, string>>({});
  // assetSpecs maps assetId -> specifications entered at issuance time
  const [assetSpecs, setAssetSpecs] = useState<Record<number, string>>({});
  // assetMacAddresses maps assetId -> MAC address entered at issuance time
  const [assetMacAddresses, setAssetMacAddresses] = useState<Record<number, string>>({});
  const [assignedToName, setAssignedToName] = useState("");
  const [conditionOnIssue, setConditionOnIssue] = useState("");
  const [endOfLifeDate, setEndOfLifeDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5);
    return d.toISOString().split("T")[0];
  });
  const [acknowledged, setAcknowledged] = useState(false);
  const [eolAutoFilled, setEolAutoFilled] = useState(false);

  // Condemnation confirm state
  const [condemnConfirmed, setCondemnConfirmed] = useState(false);

  useEffect(() => {
    fetch(`/api/approvals/${id}`).then((r) => r.json()).then((d) => {
      if (d.approval) {
        setApproval(d.approval);
        fetch(`/api/requests/${d.approval.request_id}`).then((r) => r.json()).then((d) => {
          setRequest(d.request);
          setRequestItems(d.items ?? []);
          // tentative_asset_id is informational only — shown in request summary
        });
        if (d.approval.step === "IM Initial Review" || d.approval.step === "IM Final Processing") {
          fetch("/api/assets?status=Available").then((r) => r.json()).then((d) => setAvailableAssets(d.assets ?? []));
        }
      }
    });
  }, [id]);

  // Lets the IM double-check they picked the right scanned file before submitting —
  // creates a local preview URL for whatever's currently selected, and cleans up the
  // previous one so object URLs don't pile up as the file is swapped out.
  useEffect(() => {
    if (!signedDocument) { setSignedDocumentUrl(null); return; }
    const url = URL.createObjectURL(signedDocument);
    setSignedDocumentUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [signedDocument]);

  if (!approval) return <div className="text-center py-16 text-gray-400">Loading...</div>;

  const step: string = approval.step;

  // Only show assets whose type matches what the department actually requested
  const requestedAssetTypes = new Set(
    requestItems.length > 0 ? requestItems.map((it: any) => it.asset_type) : request?.asset_type ? [request.asset_type] : []
  );
  const tentativeAssetOptions = requestedAssetTypes.size > 0
    ? availableAssets.filter((a: any) => requestedAssetTypes.has(a.asset_type))
    : availableAssets;

  function toggleAsset(itemId: number, assetId: number, needed: number, ictCategory?: string) {
    setItemAllocations((prev) => {
      const curr = prev[itemId] ?? [];
      if (curr.includes(assetId)) {
        return { ...prev, [itemId]: curr.filter((id) => id !== assetId) };
      }
      if (curr.length >= needed) return prev; // already at max
      const next = [...curr, assetId];
      // Auto-fill EOL from first asset selected
      if (next.length === 1 && ictCategory) {
        const today = new Date().toISOString().split("T")[0];
        setEndOfLifeDate(calcEolDate(today, ictCategory as IctCategory));
        setEolAutoFilled(true);
      }
      return { ...prev, [itemId]: next };
    });
  }

  const handleServiceRequest = () => {
    if (!serviceDecision) { setError("Please select Approve or Reject."); return; }
    setError("");
    startTransition(async () => {
      await processServiceRequest(parseInt(id), serviceDecision, serviceComments);
      router.push("/approvals");
    });
  };

  const handleIMInitialReview = () => {
    if (!imDecision) { setError("Please select a decision."); return; }
    if (imDecision === "Bypassed" && !signedDocument) {
      setError("Upload the signed document before bypassing approval.");
      return;
    }
    if (emergencyAnswer === "Yes" && !imNotes.trim()) {
      setError("Please provide a reason for the emergency request.");
      return;
    }
    if (emergencyAnswer === "Yes" && verbalApproval === null) {
      setError("Please indicate whether informal approval was obtained.");
      return;
    }
    if (emergencyAnswer === "Yes" && verbalApproval !== null && !verbalApprovalReason.trim()) {
      setError("Please provide a reason for the informal approval status.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await processIMInitialReview(
        parseInt(id), imDecision, tentativeAssetId, imNotes, undefined, signedDocument,
        emergencyAnswer === "Yes", emergencyAnswer === "Yes" ? verbalApproval === "Yes" : null, verbalApprovalReason
      );
      if (res?.error) { setError(res.error); return; }
      router.push("/approvals");
    });
  };

  const handleJioSioApproval = () => {
    if (!decision) { setError("Please select a decision."); return; }
    if (!comments.trim()) { setError("Comments are required."); return; }
    setError("");
    startTransition(async () => {
      await processApproval(parseInt(id), decision, comments);
      router.push("/approvals");
    });
  };

  const handleIssueAsset = () => {
    const isCondemnation = request?.request_type === "Condemnation";
    const isExternal = request?.request_type === "External Issuance";

    if (isCondemnation) {
      if (!condemnConfirmed) { setError("Please confirm the condemnation decision."); return; }
      setError("");
      startTransition(async () => {
        await issueAsset(parseInt(id), "", "", "", true, {});
        router.push("/approvals");
      });
      return;
    }

    // Validate every item has exactly the required number of assets selected
    for (const item of requestItems) {
      const selected = itemAllocations[item.id] ?? [];
      if (selected.length < item.quantity) {
        setError(`Select ${item.quantity} asset${item.quantity > 1 ? "s" : ""} for "${item.asset_type}" (${selected.length}/${item.quantity} selected)`);
        return;
      }
    }

    // Every selected asset must have a serial number — either already on record, or
    // entered now as part of assigning it to the employee. Specifications are optional.
    for (const assetId of Object.values(itemAllocations).flat()) {
      const asset = availableAssets.find((a: any) => a.id === assetId);
      if (!asset?.serial_number && !assetSerials[assetId]?.trim()) {
        setError(`Enter a serial number for ${asset?.asset_id ?? "the selected asset"} before issuing.`);
        return;
      }
    }

    if (!isExternal && !assignedToName.trim()) { setError("Assigned-to name is required."); return; }
    if (!acknowledged) { setError("Acknowledgement checkbox must be checked."); return; }
    setError("");

    startTransition(async () => {
      const res = await issueAsset(parseInt(id), assignedToName, conditionOnIssue, endOfLifeDate, acknowledged, itemAllocations, assetSerials, assetSpecs, assetMacAddresses);
      if (res?.error) { setError(res.error); return; }
      router.push("/approvals");
    });
  };

  return (
    <div>
      <div className="mb-4">
        <Link href="/approvals" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Approvals
        </Link>
      </div>

      <PageHeader title="Review Request" subtitle={`Approval step: ${step}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Left: Request Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Request Summary</h3>

          {request?.request_type === "Transfer" ? (
            <dl className="space-y-3 text-sm">
              {([
                ["Request #", request.request_number],
                ["Request Type", "Asset Transfer"],
                ["Asset", `${request.service_asset_code ?? "—"} (${request.service_asset_type ?? request.asset_type})`],
                ["From Department", request.department_name ?? "Unassigned"],
                ["To Department", request.target_dept_name ?? "—"],
                ["Requested By", request.requested_by_name],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-gray-500 mb-1">Reason</dt>
                <dd className="text-gray-700 italic">"{request.justification}"</dd>
              </div>
            </dl>
          ) : request?.request_type === "Condemnation" ? (
            <dl className="space-y-3 text-sm">
              {([
                ["Request #", request.request_number],
                ["Request Type", "Condemnation"],
                ["Asset Type", request.asset_type],
                ["Submitted By", request.requested_by_name],
                ["Reason", request.condemnation_reason ?? "—"],
                ["Data Sanitized", request.data_sanitized ? "✓ Confirmed" : "Not confirmed"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className={`font-medium ${label === "Data Sanitized" && request.data_sanitized ? "text-green-700" : "text-gray-900"}`}>{value}</dd>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-gray-500 mb-1">Justification</dt>
                <dd className="text-gray-700 italic">"{request.justification}"</dd>
              </div>
            </dl>
          ) : /* normal New Asset request */ (
            <dl className="space-y-3 text-sm">
              {([
                ["Request #", request?.request_number],
                ["Worker Name", request?.requester_name ?? request?.requested_by_name],
                ["Worker Office ID No.", request?.requester_employee_id ?? "—"],
                ["Designation", request?.requester_designation ?? "—"],
                ["Phone", request?.requester_phone ?? "—"],
                ["Email", request?.requester_email ?? "—"],
                ["Department", request?.department_name ?? "—"],
                ["Submitted By", request?.requested_by_name],
              ] as [string, string | undefined][]).map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value ?? "—"}</dd>
                </div>
              ))}
              {requestItems.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <dt className="text-gray-500 mb-2">Requested Items</dt>
                  <div className="space-y-1">
                    {requestItems.map((item: any, i: number) => (
                      <div key={item.id} className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="text-gray-700">{i + 1}. {item.asset_type}</span>
                        <span className="font-medium text-gray-900">× {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100">
                <dt className="text-gray-500 mb-1">Justification</dt>
                <dd className="text-gray-700 italic">"{request?.justification}"</dd>
              </div>
              {request?.im_notes && (
                <div className="pt-2 border-t border-gray-100">
                  <dt className="text-gray-500 mb-1">IM Notes</dt>
                  <dd className="text-gray-700">{request.im_notes}</dd>
                </div>
              )}
              {request?.tentative_asset_code && (
                <div className="pt-2 border-t border-gray-100 bg-blue-50 rounded p-2">
                  <dt className="text-xs text-blue-600 mb-0.5">Tentative Asset ID</dt>
                  <dd className="text-sm font-medium text-blue-900">{request.tentative_asset_code}</dd>
                </div>
              )}
            </dl>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href={`/requests/${approval.request_id}`} className="text-sm text-blue-600 hover:text-blue-700">View full request →</Link>
          </div>
        </div>

        {/* Right: Action panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">

          {/* ── IM Initial Review ──────────────────────────────── */}
          {step === "IM Initial Review" && (
            <>
              <h3 className="font-semibold text-gray-900 mb-1">IM Initial Check</h3>
              <p className="text-xs text-gray-500 mb-4">
                {request?.request_type === "Transfer"
                  ? "This transfer will be forwarded to JIO for approval."
                  : "This request will be forwarded to JIO automatically. Optionally link a tentative asset below, put it On Hold if stock isn't available, or use Download / Upload if it needs to be signed off outside the app."}
              </p>

              {request?.request_type === "Transfer" && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Transfer Request</p>
                  <p className="text-blue-900 font-medium">{request.service_asset_code} — {request.service_asset_type ?? request.asset_type}</p>
                  <p className="text-blue-700 text-xs mt-1">{request.department_name ?? "Unassigned"} → {request.target_dept_name}</p>
                </div>
              )}

              {request?.request_type !== "Transfer" && <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Tentative Asset (optional)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  <label className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${tentativeAssetId === null ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                    <input type="radio" name="tentative" checked={tentativeAssetId === null} onChange={() => setTentativeAssetId(null)} />
                    <span className="text-sm text-gray-500 italic">None — check later</span>
                  </label>
                  {tentativeAssetOptions.map((asset: any) => (
                    <label key={asset.id} className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${tentativeAssetId === asset.id ? "border-blue-400 bg-blue-50" : "border-transparent hover:border-blue-200"}`}>
                      <input type="radio" name="tentative" checked={tentativeAssetId === asset.id} onChange={() => setTentativeAssetId(asset.id)} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{asset.asset_id}</p>
                        <p className="text-xs text-gray-500">
                          {asset.asset_type}{asset.serial_number ? ` · S/N: ${asset.serial_number}` : ""}
                          {asset.ict_category && <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[asset.ict_category]}`}>Cat {asset.ict_category}</span>}
                        </p>
                        {asset.specifications && <p className="text-xs text-gray-400 mt-0.5">{asset.specifications}</p>}
                      </div>
                    </label>
                  ))}
                  {tentativeAssetOptions.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No available assets of the requested type</p>}
                </div>
              </div>}

              <Textarea
                label={emergencyAnswer === "Yes" ? "Reason for Emergency Request (required)" : "Notes for JIO (optional)"}
                value={imNotes}
                onChange={(e) => setImNotes(e.target.value)}
                placeholder={emergencyAnswer === "Yes" ? "Explain why this request needs to skip normal processing..." : "Stock observations, remarks..."}
                rows={3}
              />

              {request?.request_type !== "Transfer" && (
                <div className="grid gap-3 mt-4 grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = imDecision === "On Hold" ? "Approved" : "On Hold";
                      setImDecision(next);
                      setDownloadUploadSelected(false);
                      setEmergencyAnswer(null);
                      setVerbalApproval(null);
                      setVerbalApprovalReason("");
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${imDecision === "On Hold" ? "border-gray-500 bg-gray-100" : "border-gray-200 hover:border-gray-400"}`}
                  >
                    <Clock className={`h-7 w-7 ${imDecision === "On Hold" ? "text-gray-700" : "text-gray-300"}`} />
                    <span className={`text-sm font-medium text-center ${imDecision === "On Hold" ? "text-gray-800" : "text-gray-500"}`}>On Hold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (downloadUploadSelected) {
                        setDownloadUploadSelected(false);
                        setEmergencyAnswer(null);
                        setImDecision("Approved");
                      } else {
                        setDownloadUploadSelected(true);
                        setEmergencyAnswer(null);
                        setImDecision(null);
                      }
                      setVerbalApproval(null);
                      setVerbalApprovalReason("");
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${downloadUploadSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                  >
                    <Download className={`h-7 w-7 ${downloadUploadSelected ? "text-blue-600" : "text-gray-300"}`} />
                    <span className={`text-sm font-medium text-center ${downloadUploadSelected ? "text-blue-700" : "text-gray-500"}`}>Download / Upload</span>
                  </button>
                </div>
              )}
              {imDecision === "On Hold" && (
                <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                  The request will be marked <strong>On Hold</strong> — the approval stays open so you can forward it once stock is available.
                </p>
              )}

              {downloadUploadSelected && emergencyAnswer === null && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Is this an Emergency Request?
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setEmergencyAnswer("Yes"); setImDecision("Approved"); }}
                      className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmergencyAnswer("No"); setImDecision("Bypassed"); setVerbalApproval(null); setVerbalApprovalReason(""); }}
                      className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
                    >
                      No
                    </button>
                  </div>
                </div>
              )}

              {downloadUploadSelected && emergencyAnswer === "Yes" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-xs text-blue-800">
                    This will be forwarded to JIO right away, skipping the signed paperwork — enter the reason in the field above before submitting.
                  </p>

                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1.5">Was any informal approval obtained?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVerbalApproval("Yes")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${verbalApproval === "Yes" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerbalApproval("No")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${verbalApproval === "No" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {verbalApproval && (
                    <Textarea
                      label={verbalApproval === "Yes" ? "Details of Informal Approval (required)" : "Reason Informal Approval Wasn't Obtained (required)"}
                      value={verbalApprovalReason}
                      onChange={(e) => setVerbalApprovalReason(e.target.value)}
                      placeholder={verbalApproval === "Yes" ? "Who approved informally, and when..." : "Explain why informal approval could not be obtained..."}
                      rows={2}
                    />
                  )}
                </div>
              )}

              {downloadUploadSelected && emergencyAnswer === "No" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <p className="text-xs text-blue-800">
                    This still goes to JIO for digital approval — the signed copy is attached as additional proof, nothing is skipped.
                  </p>

                  <div>
                    <p className="text-xs font-medium text-blue-900 mb-1.5">1. Download &amp; get it signed</p>
                    <Link
                      href={`/print/requests/${approval.request_id}`}
                      target="_blank"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" /> Download for Signature
                    </Link>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-blue-900 mb-1.5">2. Upload the signed copy</p>
                    <div className="flex items-center gap-2">
                      <label className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-xs
                        ${signedDocument ? "border-green-400 bg-green-50 text-green-800" : "border-blue-300 bg-white text-blue-700 hover:border-blue-400"}`}>
                        {signedDocument ? <FileCheck className="h-3.5 w-3.5 shrink-0" /> : <Upload className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{signedDocument ? signedDocument.name : "Choose scanned PDF or image..."}</span>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => setSignedDocument(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {signedDocumentUrl && (
                        <a
                          href={signedDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-green-300 text-green-700 text-xs font-medium rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-blue-600 mt-1">PDF or image, up to 10MB.</p>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
              <div className="flex gap-3 mt-4">
                <Button onClick={handleIMInitialReview} isPending={isPending}
                  disabled={
                    (downloadUploadSelected && emergencyAnswer === null) ||
                    (imDecision === "Bypassed" && !signedDocument) ||
                    (emergencyAnswer === "Yes" && !imNotes.trim()) ||
                    (emergencyAnswer === "Yes" && verbalApproval === null) ||
                    (emergencyAnswer === "Yes" && verbalApproval !== null && !verbalApprovalReason.trim())
                  }
                  className={imDecision === "On Hold" ? "bg-gray-600 hover:bg-gray-700" : imDecision === "Bypassed" ? "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" : "disabled:opacity-50 disabled:cursor-not-allowed"}>
                  {imDecision === "On Hold" ? "Put on Hold" : imDecision === "Bypassed" ? "Upload & Forward to JIO" : request?.request_type === "Transfer" ? "Approve Transfer" : "Forward to JIO"}
                </Button>
                <Link href="/approvals"><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </>
          )}

          {/* ── JIO / SIO Approval ────────────────────────────── */}
          {(step === "JIO Approval" || step === "SIO Approval") && (
            <>
              <h3 className="font-semibold text-gray-900 mb-4">Your Decision</h3>
              {request?.request_type === "Condemnation" && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                  <p className="font-semibold text-orange-800">Condemnation Request</p>
                  <p className="text-orange-700 mt-0.5">Reason: {request.condemnation_reason}</p>
                  <p className={`mt-1 text-xs font-medium ${request.data_sanitized ? "text-green-700" : "text-red-600"}`}>
                    Data Sanitization: {request.data_sanitized ? "✓ Confirmed by IM" : "✗ Not confirmed"}
                  </p>
                </div>
              )}
              {step === "JIO Approval" && (
                <p className="text-xs text-gray-500 mb-4">
                  You may approve this request as final, forward it to SIO for their decision, or reject it.
                </p>
              )}
              <div className="space-y-4">
                <div className={`grid gap-3 ${step === "JIO Approval" ? "grid-cols-3" : "grid-cols-2"}`}>
                  <button
                    type="button"
                    onClick={() => setDecision("Approved")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${decision === "Approved" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300"}`}
                  >
                    <CheckCircle className={`h-8 w-8 ${decision === "Approved" ? "text-green-600" : "text-gray-300"}`} />
                    <span className={`text-sm font-medium text-center ${decision === "Approved" ? "text-green-700" : "text-gray-500"}`}>
                      {step === "JIO Approval" ? "Approve (Final)" : "Approve"}
                    </span>
                  </button>
                  {step === "JIO Approval" && (
                    <button
                      type="button"
                      onClick={() => setDecision("Forwarded")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${decision === "Forwarded" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}
                    >
                      <Forward className={`h-8 w-8 ${decision === "Forwarded" ? "text-blue-600" : "text-gray-300"}`} />
                      <span className={`text-sm font-medium text-center ${decision === "Forwarded" ? "text-blue-700" : "text-gray-500"}`}>Forward to SIO</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDecision("Rejected")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${decision === "Rejected" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-red-300"}`}
                  >
                    <XCircle className={`h-8 w-8 ${decision === "Rejected" ? "text-red-600" : "text-gray-300"}`} />
                    <span className={`text-sm font-medium ${decision === "Rejected" ? "text-red-700" : "text-gray-500"}`}>Reject</span>
                  </button>
                </div>
                <Textarea
                  label="Comments (required)"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Provide your reasoning..."
                  rows={4}
                  required
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <Button onClick={handleJioSioApproval} isPending={isPending}
                    className={decision === "Rejected" ? "bg-red-600 hover:bg-red-700" : decision === "Forwarded" ? "bg-blue-600 hover:bg-blue-700" : ""}>
                    {decision === "Rejected" ? "Reject Request" : decision === "Forwarded" ? "Forward to SIO" : "Approve Request"}
                  </Button>
                  <Link href="/approvals"><Button type="button" variant="outline">Cancel</Button></Link>
                </div>
              </div>
            </>
          )}

          {/* ── IM Final Processing ───────────────────────────── */}
          {step === "IM Final Processing" && (
            <>
              {/* ── Condemnation subpath ── */}
              {request?.request_type === "Condemnation" ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-1">Confirm Condemnation & Disposal</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    The request has received final approval. Confirm final disposal — the asset will be marked Condemned.
                  </p>

                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl mb-4 space-y-1.5 text-sm">
                    <p className="font-semibold text-orange-800">Summary</p>
                    <p className="text-orange-700">Reason: <span className="font-medium text-orange-900">{request.condemnation_reason}</span></p>
                    <p className={`text-xs font-medium ${request.data_sanitized ? "text-green-700" : "text-red-600"}`}>
                      Data Sanitization: {request.data_sanitized ? "✓ Completed" : "✗ Not done"}
                    </p>
                  </div>

                  <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors mb-4 ${condemnConfirmed ? "border-orange-400 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}>
                    <input
                      type="checkbox"
                      checked={condemnConfirmed}
                      onChange={(e) => setCondemnConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600"
                    />
                    <span className="text-sm text-gray-700">
                      I confirm this asset is to be condemned and disposed of as e-waste per Government of Meghalaya IT Asset Management Policy.
                    </span>
                  </label>

                  {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleIssueAsset}
                      isPending={isPending}
                      disabled={!condemnConfirmed}
                      className={condemnConfirmed ? "bg-orange-600 hover:bg-orange-700" : "opacity-50 cursor-not-allowed"}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" /> Condemn Asset
                    </Button>
                    <Link href="/approvals"><Button type="button" variant="outline">Cancel</Button></Link>
                  </div>
                </>
              ) : /* ── Normal issuance subpath ── */ (
                <>
                  <h3 className="font-semibold text-gray-900 mb-1">Assign & Issue Asset</h3>
                  <p className="text-xs text-gray-500 mb-4">Select the exact asset, fill in issuance details, then issue.</p>

                  <div className="space-y-4 mb-4">
                    {requestItems.map((item: any) => {
                      const isTentativeType = request?.tentative_asset_id && item.asset_type === request?.tentative_asset_type;
                      const filtered = availableAssets.filter((a: any) => {
                        if (a.asset_type !== item.asset_type) return false;
                        if (isTentativeType) return a.id === request.tentative_asset_id;
                        return true;
                      });
                      const selected = itemAllocations[item.id] ?? [];
                      const needed = item.quantity;
                      const done = selected.length === needed;
                      return (
                        <div key={item.id}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              {item.asset_type} <span className="text-red-500">*</span>
                            </label>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${done ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                              {selected.length} / {needed} selected
                            </span>
                          </div>
                          {isTentativeType && (
                            <p className="text-xs text-blue-600 mb-1">
                              Locked to the tentative asset ({request.tentative_asset_code}) selected during initial review.
                            </p>
                          )}
                          <div className="space-y-1 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-2">
                                {isTentativeType ? `Tentative asset ${request.tentative_asset_code} is no longer available` : `No available ${item.asset_type}`}
                              </p>
                            ) : filtered.map((asset: any) => {
                              const isSelected = selected.includes(asset.id);
                              const isDisabled = !isSelected && selected.length >= needed;
                              return (
                                <div key={asset.id} className={`rounded-lg border transition-colors text-xs
                                  ${isSelected ? "border-blue-400 bg-blue-50" : isDisabled ? "border-transparent opacity-40" : "border-transparent hover:border-blue-200"}`}>
                                  <label className={`flex items-center gap-2 p-2 ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isDisabled}
                                      onChange={() => toggleAsset(item.id, asset.id, needed, asset.ict_category)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                    />
                                    <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                    <span className="font-medium text-gray-900">{asset.asset_id}</span>
                                    {asset.serial_number && <span className="text-gray-500">· S/N: {asset.serial_number}</span>}
                                    <span className="flex-1" />
                                    {asset.ict_category && (
                                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[asset.ict_category]}`}>
                                        Cat {asset.ict_category}
                                      </span>
                                    )}
                                  </label>
                                  {asset.specifications && (
                                    <p className="px-2 pb-1.5 -mt-1 text-[11px] text-gray-400">{asset.specifications}</p>
                                  )}
                                  {isSelected && !asset.serial_number && (
                                    <div className="px-2 pb-2 space-y-1">
                                      <input
                                        type="text"
                                        required
                                        value={assetSerials[asset.id] ?? ""}
                                        onChange={(e) => setAssetSerials((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                                        placeholder="Serial number (required)"
                                        className={`w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${!assetSerials[asset.id]?.trim() ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                                      />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="px-2 pb-2 space-y-1">
                                      <textarea
                                        rows={2}
                                        value={assetSpecs[asset.id] ?? asset.specifications ?? ""}
                                        onChange={(e) => setAssetSpecs((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                                        placeholder="Specifications (optional) — model, processor, RAM, storage..."
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                      <input
                                        type="text"
                                        value={assetMacAddresses[asset.id] ?? asset.mac_address ?? ""}
                                        onChange={(e) => setAssetMacAddresses((prev) => ({ ...prev, [asset.id]: e.target.value }))}
                                        placeholder="MAC address (optional)"
                                        className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {request?.request_type === "External Issuance" ? (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-xs font-semibold text-purple-700 mb-1">External Issuance</p>
                        <p className="text-sm font-medium text-purple-900">
                          {request.issue_to_type}: {request.issue_to_org_name}
                        </p>
                        {request.requester_name && (
                          <p className="text-xs text-purple-600 mt-0.5">Contact: {request.requester_name}{request.requester_phone ? ` · ${request.requester_phone}` : ""}</p>
                        )}
                      </div>
                    ) : (
                      <Input
                        label="Assigned To (name)"
                        value={assignedToName}
                        onChange={(e) => setAssignedToName(e.target.value)}
                        placeholder="Full name of recipient"
                        required
                      />
                    )}

                    <Input
                      label="Condition on Issue"
                      value={conditionOnIssue}
                      onChange={(e) => setConditionOnIssue(e.target.value)}
                      placeholder="e.g. New, Refurbished, Good"
                    />
                    <div>
                      <Input
                        label="End of Life Date"
                        type="date"
                        value={endOfLifeDate}
                        onChange={(e) => { setEndOfLifeDate(e.target.value); setEolAutoFilled(false); }}
                        required
                      />
                      {eolAutoFilled && (
                        <p className="text-xs mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                          Auto-filled from asset ICT category lifespan
                        </p>
                      )}
                    </div>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Recipient has acknowledged receipt of the asset</span>
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
                  <div className="flex gap-3 mt-4">
                    <Button onClick={handleIssueAsset} isPending={isPending}>Issue Asset</Button>
                    <Link href="/approvals"><Button type="button" variant="outline">Cancel</Button></Link>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── IM Service Processing (Return / Repair) ────────── */}
          {step === "IM Service Processing" && (
            <>
              <h3 className="font-semibold text-gray-900 mb-1">
                {request?.request_type === "Return" ? "Process Return" : "Process Repair Request"}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {request?.request_type === "Return"
                  ? "Approve to mark asset as Available and return to inventory."
                  : "Approve to mark asset as Under Maintenance."}
              </p>

              {request?.service_reason && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Reason / Issue</p>
                  <p className="text-sm text-gray-700">{request.service_reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setServiceDecision("Approved")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${serviceDecision === "Approved" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300"}`}
                >
                  <CheckCircle className={`h-7 w-7 ${serviceDecision === "Approved" ? "text-green-600" : "text-gray-300"}`} />
                  <span className={`text-sm font-medium ${serviceDecision === "Approved" ? "text-green-700" : "text-gray-500"}`}>
                    {request?.request_type === "Return" ? "Confirm Return" : "Send for Repair"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setServiceDecision("Rejected")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${serviceDecision === "Rejected" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-red-300"}`}
                >
                  <XCircle className={`h-7 w-7 ${serviceDecision === "Rejected" ? "text-red-600" : "text-gray-300"}`} />
                  <span className={`text-sm font-medium ${serviceDecision === "Rejected" ? "text-red-700" : "text-gray-500"}`}>Reject</span>
                </button>
              </div>

              <Textarea
                label="Comments (optional)"
                value={serviceComments}
                onChange={(e) => setServiceComments(e.target.value)}
                placeholder="Any notes..."
                rows={3}
              />

              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
              <div className="flex gap-3 mt-4">
                <Button onClick={handleServiceRequest} isPending={isPending}
                  className={serviceDecision === "Rejected" ? "bg-red-600 hover:bg-red-700" : ""}>
                  {serviceDecision === "Rejected" ? "Reject" : "Confirm"}
                </Button>
                <Link href="/approvals"><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
