"use client";

import { useCallback, useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function run() {
      try {
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as T;
        if (active) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (active && e instanceof DOMException && e.name === "AbortError") {
          return; // ignore aborts
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
  }, [url, tick]);

  return { data, loading, error, refetch };
}
