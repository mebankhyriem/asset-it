"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div data-no-print className="print:hidden" style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
      <button
        onClick={() => window.print()}
        style={{ padding: "6px 16px", background: "#1e3a5f", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
      >
        Print
      </button>
      <button
        onClick={() => window.close()}
        style={{ padding: "6px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
      >
        Close
      </button>
    </div>
  );
}
