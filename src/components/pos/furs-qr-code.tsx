"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FursQrCodeProps {
  orderId: string;
  className?: string;
  alt?: string;
}

/**
 * Prikazuje FURS QR kodo za račun.
 * Fetcha data URL iz /api/orders/[id]/qr (generira SVG po FURS specifikaciji).
 */
export function FursQrCode({ orderId, className, alt }: FursQrCodeProps) {
  const [state, setState] = useState<{
    dataUrl: string | null;
    loading: boolean;
    error: boolean;
  }>({ dataUrl: null, loading: true, error: false });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function run() {
      try {
        const r = await fetch(`/api/orders/${orderId}/qr`, {
          signal: controller.signal,
        });
        if (!r.ok) throw new Error("Napaka");
        const json = (await r.json()) as { dataUrl: string };
        if (active) {
          setState({ dataUrl: json.dataUrl, loading: false, error: false });
        }
      } catch (e) {
        if (active && e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        if (active) {
          setState({ dataUrl: null, loading: false, error: true });
        }
      }
    }

    // Če se orderId spremeni, ponastavi na loading
    setState({ dataUrl: null, loading: true, error: false });
    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [orderId]);

  if (state.loading) {
    return (
      <div
        className={cn(
          "flex animate-pulse items-center justify-center border border-neutral-300 bg-neutral-100 text-[8px] text-neutral-400",
          className
        )}
      >
        ...
      </div>
    );
  }

  if (state.error || !state.dataUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center border border-neutral-300 bg-neutral-100 text-[8px] text-neutral-400",
          className
        )}
      >
        QR napaka
      </div>
    );
  }

  return (
    <img
      src={state.dataUrl}
      alt={alt || "FURS QR koda"}
      className={cn("bg-white", className)}
    />
  );
}
