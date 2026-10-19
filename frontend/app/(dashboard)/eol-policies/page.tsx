"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { upsertEolPolicy } from "@/app/actions/eolPolicies";
import { ASSET_TYPE_CATEGORY, CATEGORY_LIFESPAN_YEARS } from "@/lib/types";
import { AssetTypeSelect } from "@/components/ui/AssetTypeSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Trash2, Clock } from "lucide-react";

export default function EolPoliciesPage() {
  const [state, action, isPending] = useActionState(upsertEolPolicy, undefined);
  const [policies, setPolicies] = useState<any[]>([]);
  const [assetType, setAssetType] = useState("");
  const [lifespan, setLifespan] = useState(3);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    fetch("/api/eol-policies").then((r) => r.json()).then((d) => setPolicies(d.policies ?? []));
  }, [state]);

  // Whenever the typed/selected asset type (or the loaded policy list) changes, show the
  // years that would actually apply to it: an explicit saved policy if one exists, otherwise
  // the default lifespan for its ICT category — instead of always showing the initial "3".
  useEffect(() => {
    const existing = policies.find((p) => p.asset_type === assetType);
    if (existing) {
      setLifespan(existing.lifespan_years);
    } else {
      const category = ASSET_TYPE_CATEGORY[assetType];
      setLifespan(category ? CATEGORY_LIFESPAN_YEARS[category] : 3);
    }
  }, [assetType, policies]);

  // Reset back to a blank "add new" form once a save succeeds.
  useEffect(() => {
    if (state && "success" in state && state.success) {
      setAssetType("");
      setFormKey((k) => k + 1);
    }
  }, [state]);

  const remove = async (id: number) => {
    await fetch("/api/eol-policies", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const res = await fetch("/api/eol-policies");
    const d = await res.json();
    setPolicies(d.policies ?? []);
  };

  return (
    <div>
      <PageHeader title="End-of-Life Policies" subtitle="Add an asset type and set how many years it's expected to last before EOL" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 max-w-2xl">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Add / Update Policy</h3>
        <p className="text-xs text-gray-500 mb-4">
          Pick an existing asset type, or choose &ldquo;Other&rdquo; to add a brand new one — then set its lifespan.
        </p>
        <form key={formKey} action={action} className="flex items-end gap-3">
          <div className="flex-1">
            <AssetTypeSelect defaultValue={assetType} onValueChange={setAssetType} required />
          </div>
          <Input
            label="Lifespan (years)"
            name="lifespan_years"
            type="number"
            min={1}
            value={lifespan}
            onChange={(e) => setLifespan(Number(e.target.value))}
            className="w-32"
            required
          />
          <Button type="submit" isPending={isPending}>Save</Button>
        </form>
        {state && "error" in state && state.error && (
          <p className="mt-3 text-sm text-red-600">{state.error}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl">
        {policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-10 w-10 text-gray-300 mb-3" />
            <p className="font-medium text-gray-500">No policies yet</p>
            <p className="text-sm text-gray-400 mt-1">Add one above to override the default category lifespan for a type.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Asset Type</th>
                <th className="text-left px-4 py-2.5 font-medium">Lifespan (years)</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900">{p.asset_type}</td>
                  <td className="px-4 py-2.5 text-gray-600">{p.lifespan_years}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete policy"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
