"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "./Input";
import { ASSET_TYPES, ASSET_TYPE_CATEGORY, CATEGORY_LABELS } from "@/lib/types";

interface AssetTypeSelectProps {
  name?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
}

const CATEGORY_COLORS = {
  I:   "bg-purple-100 text-purple-700 border-purple-200",
  II:  "bg-blue-100 text-blue-700 border-blue-200",
  III: "bg-amber-100 text-amber-700 border-amber-200",
  IV:  "bg-teal-100 text-teal-700 border-teal-200",
};

const BASE_TYPES = [...ASSET_TYPES].filter((t) => t !== "Other").sort();

export function AssetTypeSelect({ name = "asset_type", defaultValue, error, required, onValueChange }: AssetTypeSelectProps) {
  const isCustom = !!defaultValue && !ASSET_TYPES.includes(defaultValue);
  const [selected, setSelected] = useState(isCustom ? "Other" : (defaultValue ?? ""));
  const [customValue, setCustomValue] = useState(isCustom ? (defaultValue ?? "") : "");
  const [query, setQuery] = useState(isCustom ? "Other" : (defaultValue ?? ""));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Starts with the hardcoded presets, then picks up anything an IM has already typed in
  // via "Other" on a previous asset — so a type that only ever existed as a one-off custom
  // entry still shows up here as a real, searchable, selectable option instead of everyone
  // having to retype it (and risk a slightly different casing/spelling) forever.
  const [knownTypes, setKnownTypes] = useState<string[]>(BASE_TYPES);
  useEffect(() => {
    fetch("/api/asset-types").then((r) => r.json()).then((d) => {
      const dbTypes: string[] = d.types ?? [];
      setKnownTypes((prev) => {
        const seen = new Set(prev.map((t) => t.toLowerCase()));
        const extra = dbTypes.filter((t) => !seen.has(t.toLowerCase()));
        return extra.length > 0 ? [...prev, ...extra].sort() : prev;
      });
    }).catch(() => {});
  }, []);

  const ALL_TYPES = [...knownTypes, "Other"];

  const finalValue = selected === "Other" ? customValue : selected;
  const category = ASSET_TYPE_CATEGORY[finalValue];

  // While typing a custom "Other" name, look it up against every known type — as a
  // substring match, not just exact-equality, so typing "SSD" surfaces "External Storage
  // (HDD/SSD)" / "Storage Device (Internal HDD/SSD)" as existing options, not just a
  // literal re-typing of "Laptop" under different casing. Whole point is to stop a type
  // silently fragmenting into near-duplicates because nobody noticed it already existed.
  const customSuggestions = selected === "Other" && customValue.trim().length >= 2
    ? knownTypes.filter((t) => t.toLowerCase().includes(customValue.trim().toLowerCase()))
    : [];
  const customIsExactMatch = customSuggestions.some((t) => t.toLowerCase() === customValue.trim().toLowerCase());

  useEffect(() => {
    onValueChange?.(finalValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const filtered = query.trim()
    ? ALL_TYPES.filter((t) => t.toLowerCase().includes(query.trim().toLowerCase()))
    : ALL_TYPES;

  function selectType(t: string) {
    setSelected(t);
    setQuery(t);
    setOpen(false);
    if (t !== "Other") setCustomValue("");
  }

  function clearSelection() {
    setSelected("");
    setQuery("");
    setCustomValue("");
    setOpen(true);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={finalValue} />
      <div ref={containerRef} className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Asset Type{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) setSelected(""); }}
            onFocus={(e) => { setOpen(true); e.target.select(); }}
            placeholder="Search asset type..."
            className={`w-full pl-9 pr-9 py-2 text-sm border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${error ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"}`}
          />
          {query && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No matching asset types</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => selectType(t)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                    selected === t ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {selected === "Other" && (
        <div>
          <Input
            label="Specify Asset Type"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Enter the asset type name..."
            required={required}
            autoFocus
            error={error}
          />
          {customSuggestions.length > 0 && (
            <div className="mt-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 mb-1.5">
                {customIsExactMatch
                  ? "This already exists — use it instead of creating a duplicate:"
                  : `Found existing type${customSuggestions.length > 1 ? "s" : ""} matching "${customValue.trim()}" — did you mean one of these?`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customSuggestions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => selectType(t)}
                    className="px-2 py-1 text-xs bg-white border border-amber-300 text-amber-800 rounded-full hover:bg-amber-100 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {category && (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${CATEGORY_COLORS[category]}`}>
          <span className="font-bold">ICT {category}</span>
          <span>·</span>
          <span>{CATEGORY_LABELS[category]}</span>
        </div>
      )}
    </div>
  );
}
