"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenantStore } from "@/stores/tenant-store";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// useFetch samodejno pošilja x-restaurant-id header iz tenant store-a
export function useFetch<T>(url: string): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const tenantId = useTenantStore((s) => s.current?.id);
  const tenantSlug = useTenantStore((s) => s.current?.slug);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function run() {
      try {
        const headers: Record<string, string> = {};
        if (tenantId) headers["x-restaurant-id"] = tenantId;
        if (tenantSlug) headers["x-restaurant-slug"] = tenantSlug;

        const r = await fetch(url, {
          signal: controller.signal,
          headers,
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as T;
        if (active) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (active && e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        if (active) {
          setError((e as Error).message || "Napaka");
          setLoading(false);
        }
      }
    }

    if (tick > 0) setLoading(true);
    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, tick, tenantId, tenantSlug]);

  return { data, loading, error, refetch };
}

// Helper za ročne fetch klice z tenant header-ji
export function useTenantFetch() {
  const headers = useTenantStore((s) => s.headers);
  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const tenantHeaders = headers();
      return fetch(url, {
        ...options,
        headers: {
          ...tenantHeaders,
          ...(options.headers || {}),
        },
      });
    },
    [headers]
  );
}
