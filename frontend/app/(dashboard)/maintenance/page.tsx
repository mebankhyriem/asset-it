import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentUser } from "@/lib/dal";

export default async function MaintenancePage() {
  await getCurrentUser();
  return (
    <div>
      <PageHeader title="Maintenance & Repairs" subtitle="Asset maintenance and repair log" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
        <Wrench className="h-10 w-10 text-gray-300 mb-3" />
        <p className="font-medium text-gray-700">Coming Soon</p>
        <p className="text-sm text-gray-400 mt-1">Maintenance and repair tracking will be available in a future release.</p>
      </div>
    </div>
  );
}
