"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Plus, FileCheck, Loader2 } from "lucide-react";
import { uploadEmergencyApprovalDocument } from "@/app/actions/requests";

export function EmergencyDocUpload({ requestId, hasDocument }: { requestId: number; hasDocument: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(hasDocument);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    startTransition(async () => {
      const res = await uploadEmergencyApprovalDocument(requestId, file);
      if (res?.error) { setError(res.error); return; }
      setUploaded(true);
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {uploaded && (
        <a
          href={`/api/requests/${requestId}/emergency-document`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800"
          title="View approval document"
        >
          <FileCheck className="h-3.5 w-3.5" /> View
        </a>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
        title={uploaded ? "Replace approval document" : "Upload approval document (PDF or image)"}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </button>
      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
      {error && <span className="text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
