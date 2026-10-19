"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deactivateUser, deleteUser } from "@/app/actions/users";

export function UserRowActions({ userId, isActive }: { userId: number; isActive: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDeactivate = () => {
    startTransition(async () => {
      await deactivateUser(userId);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("Remove this user permanently? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteUser(userId);
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      <Link href={`/users/${userId}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">
        View
      </Link>
      {!!isActive && (
        <button
          onClick={handleDeactivate}
          disabled={isPending}
          className="text-xs font-medium text-yellow-600 hover:text-yellow-700 disabled:opacity-40"
        >
          Deactivate
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-40"
      >
        Remove
      </button>
    </div>
  );
}
