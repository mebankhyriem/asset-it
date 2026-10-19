"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDepartment } from "@/app/actions/departments";

export function DeleteDepartmentButton({ id, name }: { id: number; name: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDepartment(id);
      if (res?.error) setError(res.error);
    });
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="h-3 w-3" /> {isPending ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
