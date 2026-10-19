"use client";

import Link from "next/link";
import { useEffect } from "react";

export function PrintButtons() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="mt-4 print:hidden flex gap-3">
      <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
        Print
      </button>
      <Link href="/requests" className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
        Back
      </Link>
    </div>
  );
}
