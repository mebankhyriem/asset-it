"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteAsset } from "@/app/actions/assets";

export function AssetRowActions({ id, assetId }: { id: number; assetId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Delete asset ${assetId}? This cannot be undone.`)) return;
    startTransition(() => deleteAsset(id));
  }

  return (
    <div className="flex items-center gap-3">
      <Link href={`/assets/${id}`} className="text-blue-600 hover:text-blue-700 text-xs font-medium">View</Link>
      <Link href={`/assets/${id}/edit`} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Edit</Link>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
        title="Delete asset"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
