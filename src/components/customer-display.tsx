"use client";

import { useEffect, useState } from "react";
import {
  Store,
  ShoppingCart,
  Clock,
  Sparkles,
  TrendingUp,
  Gift,
  Wifi,
  WifiOff,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { setCDUOpen } from "@/lib/cdu-sync";

// ============================================================
// Tipi
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

// ============================================================
// Glavna komponenta
// ============================================================

export function CustomerDisplay() {
  const [state, setState] = useState<CDUState | null>(null);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState(new Date());

  // Sync s POS prek localStorage (BroadcastChannel za cross-tab)
  useEffect(() => {
    setCDUOpen(true);
    // Preberi初始 stanje
    const stored = localStorage.getItem("cdu-state");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(parsed);
        setConnected(true);
      } catch {
        // ignore
      }
    }

    // Poslušaj za spremembe (BroadcastChannel za cross-tab komunikacijo)
    const channel = new BroadcastChannel("cdu-sync");
    channel.onmessage = (event) => {
      if (event.data?.type === "cdu-update") {
        setState(event.data.payload);
        setConnected(true);
      } else if (event.data?.type === "cdu-clear") {
        setState(null);
      }
    };

    // Poslušaj tudi localStorage spremembe (fallback)
    const storageHandler = (e: StorageEvent) => {
      if (e.key === "cdu-state" && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
          setConnected(true);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", storageHandler);

    return () => {
      setCDUOpen(false);
      channel.close();
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  // Ura
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const time = new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Store className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gostilna Pri Marku</h1>
            <p className="text-sm text-slate-400">
              {state?.tableName ? `Miza: ${state.tableName}` : "Dobrodošli"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
              connected
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-rose-500/20 text-rose-400"
            }`}
          >
            {connected ? (
              <>
                <Wifi className="h-4 w-4" />
                Povezano
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                Čakam na blagajno...
              </>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{time}</p>
            <p className="text-xs capitalize text-slate-400">{date}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col px-8 pb-8">
        {!state || state.items.length === 0 ? (
          // Idle state — prikaži reklame/promocije
          <IdleScreen />
        ) : (
          // Active state — prikaži postavke
          <ActiveDisplay state={state} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 px-8 py-4 text-center text-xs text-slate-500">
        Gostilna Pri Marku · Prevozna 11, Ljubljana · 01 234 56 78 · Hvala za vaš obisk!
      </footer>
    </div>
  );
}

// ============================================================
// Idle Screen (ko ni aktivnega naročila)
// ============================================================

function IdleScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {/* Promocija 1 — Happy Hour */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6 text-center ring-1 ring-amber-500/30">
          <Clock className="mx-auto mb-3 h-10 w-10 text-amber-400" />
          <h2 className="mb-1 text-xl font-bold text-amber-400">Happy Hour</h2>
          <p className="text-sm text-slate-300">
            16:00 - 18:00
          </p>
          <p className="mt-2 text-2xl font-bold text-white">-30% na pijačo</p>
        </div>

        {/* Promocija 2 — Dnevna jed */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-6 text-center ring-1 ring-emerald-500/30">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
          <h2 className="mb-1 text-xl font-bold text-emerald-400">Dnevna jed</h2>
          <p className="text-sm text-slate-300">Biftek z gobovo omako</p>
          <p className="mt-2 text-2xl font-bold text-white">24,90 €</p>
        </div>

        {/* Promocija 3 — Loyalty */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 text-center ring-1 ring-purple-500/30">
          <Gift className="mx-auto mb-3 h-10 w-10 text-purple-400" />
          <h2 className="mb-1 text-xl font-bold text-purple-400">Zvestoba</h2>
          <p className="text-sm text-slate-300">Zbiraj točke</p>
          <p className="mt-2 text-2xl font-bold text-white">1 točka / 10 €</p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-lg text-slate-400">
          Skenirajte QR kodo na mizi za meni in naročilo
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Ali počakajte na natakarja
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Active Display (ko je aktivno naročilo)
// ============================================================

function ActiveDisplay({ state }: { state: CDUState }) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4 flex items-center gap-2 border-b border-slate-700/50 pb-3">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-semibold">Vaše naročilo</h2>
          <span className="ml-auto text-sm text-slate-400">
            {state.items.length} postavk
          </span>
        </div>

        <div className="space-y-2">
          {state.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl bg-slate-800/50 p-4 ring-1 ring-slate-700/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-lg font-bold text-amber-400">
                {item.quantity}×
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium">{item.name}</p>
                {item.note && (
                  <p className="text-sm italic text-amber-400">⚠ {item.note}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums">
                  {formatEUR(item.unitPrice * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-xs text-slate-400">
                    {formatEUR(item.unitPrice)} × {item.quantity}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-white/90">Skupaj za plačilo</span>
          <span className="text-4xl font-bold tabular-nums text-white">
            {formatEUR(state.total)}
          </span>
        </div>
        {state.operator && (
          <p className="mt-2 text-sm text-white/80">
            Postreže: {state.operator}
          </p>
        )}
      </div>
    </div>
  );
}
