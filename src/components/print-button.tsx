"use client";

import { useEffect } from "react";

export function PrintButton() {
  // Samodejno odpri print dialog po 500ms (samo na client)
  useEffect(() => {
    if (!window.location.search.includes("noprint")) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <button
      className="print-btn no-print"
      onClick={() => window.print()}
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "#f59e0b",
        color: "white",
        border: "none",
        padding: "12px 24px",
        borderRadius: "8px",
        fontSize: "14px",
        cursor: "pointer",
        fontWeight: "bold",
      }}
    >
      🖨️ Natisni / Shrani PDF
    </button>
  );
}
