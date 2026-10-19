import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/dal";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role={user.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav userName={user.name} role={user.role} departmentName={user.departmentName} />
        <main className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="max-w-7xl mx-auto px-6 py-6 print:max-w-none print:p-0">
            <div className="flex gap-6">
              <div className="flex-1">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
