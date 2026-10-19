"use client";

import { useTransition } from "react";
import { LogOut, Bell, User } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { RoleBadge } from "@/components/ui/Badge";
import type { UserRole } from "@/lib/types";

interface TopNavProps {
  userName: string;
  role: UserRole;
  departmentName?: string | null;
}

export function TopNav({ userName, role, departmentName }: TopNavProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 print:hidden">
      <div />
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="bg-blue-100 p-1.5 rounded-full">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
            <RoleBadge role={role} />
            {departmentName && <p className="text-xs text-gray-500 mt-0.5">{departmentName}</p>}
          </div>
        </div>

        <button
          onClick={() => startTransition(() => logout())}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
