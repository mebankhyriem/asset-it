import { Monitor, FileText, CheckSquare, Users, TrendingUp, Wrench, Trash2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetStatusBadge, RequestStatusBadge } from "@/components/ui/Badge";
import type { UserRole } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const db = getDb();
  const isDeptUser = user.role === "DEPT_USER";

  // Dept user: only their own request stats
  const myPending  = isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM requests WHERE requested_by = ? AND status IN ('Pending','IM Review','JIO Approved','SIO Approved','Forwarded','On Hold')").get(user.id) as any).cnt : 0;
  const myApproved = isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM requests WHERE requested_by = ? AND status IN ('Issued')").get(user.id) as any).cnt : 0;
  const myRejected = isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM requests WHERE requested_by = ? AND status = 'Rejected'").get(user.id) as any).cnt : 0;

  // Non-dept stats
  const totalAssets     = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status != 'Condemned'").get() as any).cnt : 0;
  const availableAssets = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 'Available'").get() as any).cnt : 0;
  const assignedAssets  = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 'Assigned'").get() as any).cnt : 0;
  const maintenanceAssets = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 'Maintenance'").get() as any).cnt : 0;
  const returnedAssets  = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 'Returned'").get() as any).cnt : 0;
  const condemnedAssets = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM assets WHERE status = 'Condemned'").get() as any).cnt : 0;
  const pendingRequests = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM requests WHERE status IN ('Pending','IM Review','JIO Approved','SIO Approved','Forwarded')").get() as any).cnt : 0;
  const pendingApprovals = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM approvals WHERE status = 'Pending'").get() as any).cnt : 0;
  const totalUsers      = !isDeptUser ? (await db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1").get() as any).cnt : 0;

  const recentRequests = isDeptUser
    ? await db.prepare(`SELECT r.*, d.name as department_name, u.name as requested_by_name FROM requests r LEFT JOIN departments d ON r.department_id = d.id LEFT JOIN users u ON r.requested_by = u.id WHERE r.requested_by = ? ORDER BY r.created_at DESC LIMIT 6`).all(user.id) as any[]
    : await db.prepare(`SELECT r.*, d.name as department_name, u.name as requested_by_name FROM requests r LEFT JOIN departments d ON r.department_id = d.id LEFT JOIN users u ON r.requested_by = u.id ORDER BY r.created_at DESC LIMIT 6`).all() as any[];

  // Dept users only see assets actually assigned to their own department — not
  // unassigned stock or other departments' assets, matching /assets and /inventory.
  const recentAssets = isDeptUser
    ? await db.prepare(`
        SELECT a.*, d.name as department_name
        FROM assets a LEFT JOIN departments d ON a.department_id = d.id
        WHERE a.department_id = ? AND a.status = 'Assigned'
        ORDER BY a.created_at DESC LIMIT 6
      `).all(user.departmentId) as any[]
    : await db.prepare(`
        SELECT a.*, d.name as department_name
        FROM assets a LEFT JOIN departments d ON a.department_id = d.id
        ORDER BY a.created_at DESC LIMIT 6
      `).all() as any[];

  return (
    <div>
      <PageHeader
        title={isDeptUser && user.departmentName ? user.departmentName : `Welcome, ${user.name.split(" ")[0]}`}
        subtitle={isDeptUser && user.departmentName ? `Welcome, ${user.name.split(" ")[0]} · IT Asset Management Dashboard` : "IT Asset Management Dashboard"}
      />

      {isDeptUser ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard title="Pending Requests" value={myPending} icon={FileText} color="yellow" subtitle="Awaiting action" href="/requests" />
          <StatCard title="Approved / Issued" value={myApproved} icon={CheckSquare} color="green" subtitle="Fulfilled requests" href="/requests?status=Issued" />
          <StatCard title="Rejected" value={myRejected} icon={XCircle} color="red" subtitle="Declined requests" href="/requests?status=Rejected" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Assets" value={totalAssets} icon={Monitor} color="blue" subtitle="Active inventory" href="/assets" />
            <StatCard title="Available" value={availableAssets} icon={TrendingUp} color="green" subtitle="Ready to allocate" href="/assets?status=Available" />
            <StatCard title="Assigned" value={assignedAssets} icon={CheckSquare} color="indigo" subtitle="Currently in use" href="/assets?status=Assigned" />
            <StatCard title="Maintenance" value={maintenanceAssets} icon={Wrench} color="yellow" subtitle="Under repair" href="/assets?status=Maintenance" />
          </div>
          {(returnedAssets > 0 || condemnedAssets > 0) && (
            <div className="flex gap-4 mb-6">
              {returnedAssets > 0 && <StatCard title="Return Inventory" value={returnedAssets} icon={RotateCcw} color="purple" subtitle="Awaiting inspection" href="/assets?status=Returned" />}
              {condemnedAssets > 0 && <StatCard title="Condemned" value={condemnedAssets} icon={Trash2} color="red" subtitle="Awaiting e-waste disposal" href="/assets?status=Condemned" />}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard title="Pending Requests" value={pendingRequests} icon={FileText} color="yellow" subtitle="Awaiting action" href="/requests?status=Pending" />
            {(["INVENTORY_MANAGER", "SIO", "JIO"] as UserRole[]).includes(user.role) && (
              <StatCard title="Pending Approvals" value={pendingApprovals} icon={CheckSquare} color="purple" subtitle="Awaiting your review" href="/approvals" />
            )}
            {user.role === "INVENTORY_MANAGER" && (
              <StatCard title="Active Users" value={totalUsers} icon={Users} color="blue" subtitle="System users" href="/users" />
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Requisitions</h3>
            <Link href="/requests" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRequests.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No requests yet</p>
            ) : recentRequests.map((req) => (
              <Link key={req.id} href={`/requests/${req.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.request_number}</p>
                  <p className="text-xs text-gray-500">{req.asset_type} · {req.requested_by_name}</p>
                </div>
                <RequestStatusBadge status={req.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Asset Inventory</h3>
            <Link href="/assets" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentAssets.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No assets yet</p>
            ) : recentAssets.map((asset) => (
              <Link key={asset.id} href={`/assets/${asset.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{asset.asset_id}</p>
                  <p className="text-xs text-gray-500">{asset.asset_type} · {asset.department_name ?? "Unassigned"}</p>
                </div>
                <AssetStatusBadge status={asset.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
