"use client";

// ============================================================
// CDU Sync helper — sinhronizacija med POS in Customer Display Unit
// ============================================================
// Uporablja BroadcastChannel API za cross-tab komunikacijo.
// POS kliše updateCDU() ob vsaki spremembi vozička.
// CDU posluša in prikaže postavke v realnem času.
// ============================================================

interface CDUItem {
  name: string;
  quantity: number;
  unitPrice: number;
  note?: string;
}

interface CDUState {
  items: CDUItem[];
  total: number;
  tableName?: string;
  operator?: string;
  timestamp: number;
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel("cdu-sync");
    } catch {
      return null;
    }
  }
  return channel;
}

// POS kliše to ob vsaki spremembi vozička
export function updateCDU(state: Omit<CDUState, "timestamp">) {
  // Shrani v localStorage (fallback za cross-browser)
  try {
    localStorage.setItem("cdu-state", JSON.stringify(state));
  } catch {
    // ignore
  }

  // Pošlji prek BroadcastChannel (cross-tab)
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: "cdu-update", payload: state });
  }
}

// POS kliše to ob plačilu/zaključku
export function clearCDU() {
  try {
    localStorage.removeItem("cdu-state");
  } catch {
    // ignore
  }
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ type: "cdu-clear" });
  }
}

// Preveri ali je CDU odprt v drugem tab-u (za prikaz indikatorja v POS)
export function isCDUOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("cdu-open") === "true";
  } catch {
    return false;
  }
}

// CDU kliče to ob odprtju
export function setCDUOpen(open: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cdu-open", open ? "true" : "false");
  } catch {
    // ignore
  }
}
