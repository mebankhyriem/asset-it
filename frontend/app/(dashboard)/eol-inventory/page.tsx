import Link from "next/link";
import { Trash2, Archive, Recycle, Printer } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDb } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetStatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSET_TYPE_CATEGORY } from "@/lib/types";
import type { IctCategory } from "@/lib/types";
import { PrintTrigger } from "@/app/print/requests/PrintTrigger";

const CATEGORY_COLORS: Record<IctCategory, string> = {
  I:   "bg-purple-100 text-purple-700",
  II:  "bg-blue-100 text-blue-700",
  III: "bg-amber-100 text-amber-700",
  IV:  "bg-teal-100 text-teal-700",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function DaysOverdueBadge({ days }: { days: number }) {
  if (days <= 0) return <span className="text-xs text-gray-400">Due soon</span>;
  const cls =
    days > 365
      ? "bg-red-100 text-red-700"
      : days > 90
      ? "bg-orange-100 text-orange-700"
      : "bg-yellow-100 text-yellow-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {days}d overdue
    </span>
  );
}

function EolTable({ assets, sort }: { assets: any[]; sort: string }) {
  function sortHref(col: string, currentSort: string) {
    const isActive = currentSort === col;
    const next = isActive ? `-${col}` : col;
    return `?sort=${next}`;
  }

  function SortTh({ col, label }: { col: string; label: string }) {
    const isAsc = sort === col;
    const isDesc = sort === `-${col}`;
    return (
      <th className="text-left px-4 py-3 font-medium text-gray-600">
        <Link href={sortHref(col, sort)} className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors">
          {label}
          <span className="text-gray-300 text-[10px]">
            {isAsc ? "▲" : isDesc ? "▼" : "⇅"}
          </span>
        </Link>
      </th>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <SortTh col="asset_id" label="Asset ID" />
              <SortTh col="asset_type" label="Type" />
              <th className="text-left px-4 py-3 font-medium text-gray-600">Serial No.</th>
              <SortTh col="department_name" label="Department" />
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <SortTh col="end_of_life_date" label="EOL Date" />
              <SortTh col="days_overdue" label="Overdue" />
              <th className="px-4 py-3 print:hidden" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-blue-600">
                  <Link href={`/assets/${a.id}`} className="hover:underline">{a.asset_id}</Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{a.asset_type}</p>
                  {ASSET_TYPE_CATEGORY[a.asset_type] && (
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${CATEGORY_COLORS[ASSET_TYPE_CATEGORY[a.asset_type]]}`}>
                      ICT {ASSET_TYPE_CATEGORY[a.asset_type]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.serial_number ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{a.department_name ?? "—"}</td>
                <td className="px-4 py-3"><AssetStatusBadge status={a.status} /></td>
                <td className="px-4 py-3 text-gray-700">{formatDate(a.end_of_life_date)}</td>
                <td className="px-4 py-3">
                  {a.days_overdue != null ? <DaysOverdueBadge days={a.days_overdue} /> : "—"}
                </td>
                <td className="px-4 py-3 text-right print:hidden">
                  {a.status === "Condemned" ? (
                    <Link
                      href={`/assets/${a.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <Archive className="h-3 w-3" /> Record Disposal
                    </Link>
                  ) : a.status === "Returned" ? (
                    <span className="text-xs text-gray-400 italic">Unused — in stock</span>
                  ) : (
                    <Link
                      href={`/requests/condemn/${a.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Condemn
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Print layout ─────────────────────────────────────────────────────────────

function PrintTable({ assets }: { assets: any[] }) {
  return (
    <table className="w-full text-xs border-collapse border border-gray-300">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Asset ID</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Type</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Serial No.</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Department</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Status</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">EOL Date</th>
          <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Days Overdue</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((a) => (
          <tr key={a.id} className="even:bg-gray-50">
            <td className="border border-gray-300 px-2 py-1.5 font-mono">{a.asset_id}</td>
            <td className="border border-gray-300 px-2 py-1.5">{a.asset_type}</td>
            <td className="border border-gray-300 px-2 py-1.5 font-mono">{a.serial_number ?? "—"}</td>
            <td className="border border-gray-300 px-2 py-1.5">{a.department_name ?? "—"}</td>
            <td className="border border-gray-300 px-2 py-1.5">{a.status}</td>
            <td className="border border-gray-300 px-2 py-1.5">{formatDate(a.end_of_life_date)}</td>
            <td className="border border-gray-300 px-2 py-1.5">
              {a.days_overdue != null && a.days_overdue > 0 ? `${a.days_overdue}d` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SortCol = "asset_id" | "asset_type" | "department_name" | "end_of_life_date" | "days_overdue";

const ALLOWED_SORT_COLS: SortCol[] = ["asset_id", "asset_type", "department_name", "end_of_life_date", "days_overdue"];

function parseSort(raw: string): { col: SortCol; dir: "ASC" | "DESC" } {
  const desc = raw.startsWith("-");
  const col = (desc ? raw.slice(1) : raw) as SortCol;
  if (!ALLOWED_SORT_COLS.includes(col)) return { col: "end_of_life_date", dir: "ASC" };
  return { col, dir: desc ? "DESC" : "ASC" };
}

function applySortAndFilter(assets: any[], col: SortCol, dir: "ASC" | "DESC", typeFilter: string) {
  let result = typeFilter ? assets.filter((a) => a.asset_type === typeFilter) : assets;
  result = [...result].sort((a, b) => {
    const av = a[col] ?? "";
    const bv = b[col] ?? "";
    if (av < bv) return dir === "ASC" ? -1 : 1;
    if (av > bv) return dir === "ASC" ? 1 : -1;
    return 0;
  });
  return result;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function EolInventoryPage(props: { searchParams: Promise<Record<string, string>> }) {
  const user = await getCurrentUser();
  if (user.role !== "INVENTORY_MANAGER") redirect("/dashboard");

  const sp = await props.searchParams;
  const print = sp.print === "1";
  const today = new Date().toISOString().split("T")[0];
  const dateFrom = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : "";
  const dateTill = sp.till && /^\d{4}-\d{2}-\d{2}$/.test(sp.till) ? sp.till : today;
  const typeFilter = sp.type ?? "";
  const rawSort = sp.sort ?? "end_of_life_date";
  const { col: sortCol, dir: sortDir } = parseSort(rawSort);

  const db = getDb();

  // Binding '' against the DATE column (rather than the JS-side dateFrom === '' check)
  // fails under MySQL's strict typing, so the lower-bound clause is only included at all
  // when a from-date was actually supplied.
  const fromClause = dateFrom ? "AND a.end_of_life_date >= ?" : "";
  const fromParams = dateFrom ? [dateFrom] : [];

  // Single flat list: every EOL asset (Available/Returned/Maintenance/Assigned, past
  // end-of-life within the date range) plus every Condemned asset regardless of date —
  // Condemned assets don't get an overdue count since they're already out of service.
  const assetsRaw = await db.prepare(`
    SELECT a.*, d.name as department_name,
      CASE WHEN a.status = 'Condemned' THEN NULL ELSE DATEDIFF(?, a.end_of_life_date) END as days_overdue
    FROM assets a LEFT JOIN departments d ON a.department_id = d.id
    WHERE (
      a.status IN ('Available', 'Returned', 'Maintenance', 'Assigned')
      AND a.end_of_life_date IS NOT NULL
      AND a.end_of_life_date <= ?
      ${fromClause}
    ) OR a.status = 'Condemned'
  `).all(dateTill, dateTill, ...fromParams) as any[];

  const assets = applySortAndFilter(assetsRaw, sortCol, sortDir, typeFilter);
  const grandTotal = assets.length;

  // Asset types present in EOL data for the filter dropdown
  const allEolTypes = [...new Set(assetsRaw.map((a) => a.asset_type as string))].sort();

  // ── Print view ──────────────────────────────────────────────────────────────
  if (print) {
    return (
      <div className="p-6 print:p-0 text-gray-900">
        <div className="mb-6 border-b border-gray-300 pb-4">
          <h1 className="text-xl font-bold">E-Waste / EOL Inventory Report</h1>
          <p className="text-sm font-medium text-gray-700 mt-1">
            {dateFrom ? <>EOL Date: <strong>{formatDateLong(dateFrom)}</strong> to <strong>{formatDateLong(dateTill)}</strong></> : <>As of: <strong>{formatDateLong(dateTill)}</strong></>}
            {typeFilter && <span className="ml-2 text-gray-500">· Type: {typeFilter}</span>}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Printed: {new Date().toLocaleString("en-IN")} &nbsp;·&nbsp;
            Total: {grandTotal}
          </p>
        </div>

        {grandTotal > 0 ? (
          <PrintTable assets={assets} />
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No EOL assets found for this date range.</p>
        )}

        <PrintTrigger />
        <div className="print:hidden">
          <Link href={`/eol-inventory?from=${dateFrom}&till=${dateTill}&type=${typeFilter}&sort=${rawSort}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Back</Link>
        </div>
      </div>
    );
  }

  // ── Normal view ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="E-Waste / EOL Inventory"
        subtitle="Assets at end-of-life and condemned assets awaiting disposal"
        actions={
          <Link
            href={`/eol-inventory?print=1&from=${dateFrom}&till=${dateTill}&type=${typeFilter}&sort=${rawSort}`}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" /> Print
          </Link>
        }
      />

      {/* Filters */}
      <form className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">EOL date from</label>
          <input
            type="date"
            name="from"
            defaultValue={dateFrom}
            max={dateTill}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">till</label>
          <input
            type="date"
            name="till"
            defaultValue={dateTill}
            max={today}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Asset type</label>
          <select
            name="type"
            defaultValue={typeFilter}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            {allEolTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <input type="hidden" name="sort" value={rawSort} />
        <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Apply
        </button>
        {(dateFrom || dateTill !== today || typeFilter) && (
          <Link href="/eol-inventory" className="text-sm text-gray-500 hover:text-gray-700 underline">
            Reset
          </Link>
        )}
      </form>

      {(dateFrom || dateTill !== today) && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {dateFrom
            ? <>Showing EOL inventory with end-of-life date from <strong>{formatDateLong(dateFrom)}</strong> to <strong>{formatDateLong(dateTill)}</strong>.</>
            : <>Showing EOL inventory as of <strong>{formatDateLong(dateTill)}</strong>.</>}
        </div>
      )}

      {grandTotal === 0 ? (
        <EmptyState
          icon={Recycle}
          title="No EOL assets"
          description={`No assets were past end-of-life ${dateFrom ? `between ${formatDateLong(dateFrom)} and ${formatDateLong(dateTill)}` : `as of ${formatDateLong(dateTill)}`}${typeFilter ? ` for type "${typeFilter}"` : ""}.`}
        />
      ) : (
        <EolTable assets={assets} sort={rawSort} />
      )}
    </div>
  );
}
