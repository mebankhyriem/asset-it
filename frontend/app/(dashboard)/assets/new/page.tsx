"use client";

import { useActionState } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createAsset } from "@/app/actions/assets";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetTypeSelect } from "@/components/ui/AssetTypeSelect";
import { ASSET_TYPE_CODE, OS_OPTIONS, RAM_OPTIONS, PROCESSOR_OPTIONS, type SpecDeviceKind } from "@/lib/types";

// Only these asset types get the structured OS / RAM / Processor prompt — everything
// else keeps using the free-text Specifications field on the edit page instead.
const COMPUTER_TYPES = new Set(["Laptop", "Desktop Computer"]);
const MOBILE_TYPES = new Set(["Tablet", "Mobile Phone / Smartphone"]);

// Merges the hardcoded presets with anything previously saved via "Other" (fetched from
// /api/spec-options), de-duplicated and with "Other..." always last.
function withLearned(presets: string[], learned: string[]): string[] {
  const merged = [...presets, ...learned.filter((v) => !presets.includes(v))];
  return merged;
}

// Substring match against the known options — same lookup as AssetTypeSelect, so typing
// "harmony" while specifying a custom OS surfaces "HarmonyOS" rather than letting it
// silently become a second, near-duplicate entry.
function specSuggestions(options: string[], customValue: string): string[] {
  const q = customValue.trim().toLowerCase();
  if (q.length < 2) return [];
  return options.filter((o) => o.toLowerCase().includes(q));
}

function OtherSuggestions({ suggestions, query, onPick }: { suggestions: string[]; query: string; onPick: (value: string) => void }) {
  if (suggestions.length === 0) return null;
  const isExact = suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase());
  return (
    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
      <p className="text-xs text-amber-700 mb-1.5">
        {isExact
          ? "This already exists — use it instead of creating a duplicate:"
          : `Found existing option${suggestions.length > 1 ? "s" : ""} matching "${query.trim()}" — did you mean one of these?`}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="px-2 py-1 text-xs bg-white border border-amber-300 text-amber-800 rounded-full hover:bg-amber-100 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewAssetPage() {
  const [state, action, isPending] = useActionState(createAsset, undefined);
  const [quantity, setQuantity] = useState(1);
  const [assetType, setAssetType] = useState("");

  // Values other IMs have already typed in via "Other" — merged into the pick lists below
  // so the same value never needs to be retyped twice.
  const [learned, setLearned] = useState<{ os: string[]; ram: string[]; processor: string[] }>({ os: [], ram: [], processor: [] });
  useEffect(() => {
    fetch("/api/spec-options").then((r) => r.json()).then((d) => setLearned({ os: d.os ?? [], ram: d.ram ?? [], processor: d.processor ?? [] }));
  }, []);

  // Structured specs — only collected for computers and mobile devices. Every field
  // follows the same "pick one, or choose Other and type it in" pattern; whatever's typed
  // via Other gets saved server-side so it becomes a normal option from then on.
  const [os, setOs] = useState("");
  const [customOs, setCustomOs] = useState("");
  const [ram, setRam] = useState("");
  const [customRam, setCustomRam] = useState("");
  const [processor, setProcessor] = useState("");
  const [customProcessor, setCustomProcessor] = useState("");

  const deviceKind: SpecDeviceKind | null = COMPUTER_TYPES.has(assetType) ? "computer" : MOBILE_TYPES.has(assetType) ? "mobile" : null;

  // OS/processor choices differ by device kind — reset the pick whenever it changes so a
  // stale "Chrome OS" doesn't linger after switching from a laptop to a phone, etc. RAM
  // options don't depend on device kind, so that pick is left alone.
  useEffect(() => {
    setOs(""); setCustomOs("");
    setProcessor(""); setCustomProcessor("");
  }, [deviceKind]);

  const effectiveOs = os === "Other" ? customOs.trim() : os;
  const effectiveRam = ram === "Other" ? customRam.trim() : ram;
  const effectiveProcessor = processor === "Other" ? customProcessor.trim() : processor;

  const err = (field: string) => state?.errors?.[field]?.[0];
  const year = new Date().getFullYear();
  const typeCode = assetType ? (ASSET_TYPE_CODE[assetType] ?? assetType.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X")) : null;

  const ramOptions = withLearned(RAM_OPTIONS, learned.ram);
  const osOptions = deviceKind ? withLearned(OS_OPTIONS[deviceKind], learned.os) : [];
  const processorOptions = deviceKind ? withLearned(PROCESSOR_OPTIONS[deviceKind], learned.processor) : [];

  return (
    <div>
      <PageHeader title="Add New Asset" subtitle="Register a new IT asset" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <form action={action} className="space-y-5">

          <AssetTypeSelect required error={err("asset_type")} onValueChange={setAssetType} />
          <p className="text-xs text-gray-500 -mt-3">
            New assets are always added with status <span className="font-medium text-gray-700">Available</span>. Change status later from the asset's edit page once it's issued or sent for maintenance.
          </p>

          {/* Structured specs — Laptop / Desktop Computer / Tablet / Mobile Phone only */}
          {deviceKind && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <p className="text-sm font-semibold text-gray-800">Specifications</p>

              <div>
                <Select
                  label="Operating System"
                  value={os}
                  onChange={(e) => setOs(e.target.value)}
                  placeholder="Select the OS installed..."
                  options={[...osOptions.map((o) => ({ value: o, label: o })), { value: "Other", label: "Other..." }]}
                />
                {os === "Other" && (
                  <>
                    <Input
                      className="mt-2"
                      value={customOs}
                      onChange={(e) => setCustomOs(e.target.value)}
                      placeholder="Enter the OS name..."
                      autoFocus
                    />
                    <OtherSuggestions
                      suggestions={specSuggestions(osOptions, customOs)}
                      query={customOs}
                      onPick={(v) => { setOs(v); setCustomOs(""); }}
                    />
                  </>
                )}
                <input type="hidden" name="os" value={effectiveOs} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Select
                    label="RAM"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="Select RAM..."
                    options={[...ramOptions.map((r) => ({ value: r, label: r })), { value: "Other", label: "Other..." }]}
                  />
                  {ram === "Other" && (
                    <>
                      <Input
                        className="mt-2"
                        value={customRam}
                        onChange={(e) => setCustomRam(e.target.value)}
                        placeholder="Enter RAM size, e.g. 20 GB"
                        autoFocus
                      />
                      <OtherSuggestions
                        suggestions={specSuggestions(ramOptions, customRam)}
                        query={customRam}
                        onPick={(v) => { setRam(v); setCustomRam(""); }}
                      />
                    </>
                  )}
                  <input type="hidden" name="ram" value={effectiveRam} />
                </div>
                <div>
                  <Select
                    label="Processor"
                    value={processor}
                    onChange={(e) => setProcessor(e.target.value)}
                    placeholder="Select processor..."
                    options={[...processorOptions.map((p) => ({ value: p, label: p })), { value: "Other", label: "Other..." }]}
                  />
                  {processor === "Other" && (
                    <>
                      <Input
                        className="mt-2"
                        value={customProcessor}
                        onChange={(e) => setCustomProcessor(e.target.value)}
                        placeholder="Enter processor, e.g. Intel Core i5"
                        autoFocus
                      />
                      <OtherSuggestions
                        suggestions={specSuggestions(processorOptions, customProcessor)}
                        query={customProcessor}
                        onPick={(v) => { setProcessor(v); setCustomProcessor(""); }}
                      />
                    </>
                  )}
                  <input type="hidden" name="processor" value={effectiveProcessor} />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Picked "Other"? Whatever you type is saved so it shows up as a normal option next time.
              </p>
            </div>
          )}

          {/* Quantity */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-semibold text-blue-800 mb-1">
              Number of Assets to Add
            </label>
            <p className="text-xs text-blue-600 mb-3">
              Serial numbers are added later when each asset is assigned.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border-2 border-blue-300 text-blue-700 font-bold hover:bg-blue-100 flex items-center justify-center"
              >−</button>
              <span className="text-2xl font-bold text-blue-900 w-10 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full border-2 border-blue-300 text-blue-700 font-bold hover:bg-blue-100 flex items-center justify-center"
              >+</button>
              <input type="hidden" name="quantity" value={quantity} />
            </div>
          </div>

          {/* Asset ID preview — always auto-generated as {CODE}-{YEAR}-{seq} */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs font-medium text-gray-500 mb-1">Asset ID (auto-generated)</p>
            {typeCode ? (
              <p className="font-mono text-sm text-gray-900">
                {quantity > 1
                  ? <>{typeCode}-{year}-<span className="text-gray-400">NNN</span> through {typeCode}-{year}-<span className="text-gray-400">NNN</span> ({quantity} assets)</>
                  : <>{typeCode}-{year}-<span className="text-gray-400">NNN</span></>}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">Select an asset type above to preview the ID format</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isPending={isPending}>
              {quantity > 1 ? `Add ${quantity} Assets` : "Save Asset"}
            </Button>
            <Link href="/assets">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
