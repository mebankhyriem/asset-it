"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteRequest } from "@/app/actions/requests";

export function RequestRowActions({
  id,
  requestNumber,
  canDelete,
}: {
  id: number;
  requestNumber: string;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete request ${requestNumber}? This cannot be undone.`)) return;
    startTransition(() => deleteRequest(id));
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/requests/${id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
          title="Delete request"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
