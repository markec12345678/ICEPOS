"use client";

import { useEffect } from "react";
import { useTenantStore } from "@/stores/tenant-store";

/**
 * Globalni fetch interceptor.
 * Patch-a window.fetch tako da samodejno doda:
 *   - x-restaurant-id / x-restaurant-slug header (iz tenant store-a)
 *   - x-operator-pin header (iz localStorage - za avtorizirane klice)
 * na vse /api/ klice.
 *
 * To pomeni da vse komponente, ki uporabljajo navaden fetch("/api/..."),
 * samodejno dobijo tenant header.
 */
export function FetchInterceptor() {
  const tenantId = useTenantStore((s) => s.current?.id);
  const tenantSlug = useTenantStore((s) => s.current?.slug);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      // Samo za /api/ klice
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (!url.includes("/api/") && !url.startsWith("/api/")) {
        return originalFetch(input, init);
      }

      // Preberi obstoječe header-je
      const existingHeaders = new Headers(init?.headers);
      const headers = new Headers(init?.headers);

      // Dodaj tenant header-je če manjkajo
      if (tenantId && !existingHeaders.has("x-restaurant-id")) {
        headers.set("x-restaurant-id", tenantId);
      }
      if (tenantSlug && !existingHeaders.has("x-restaurant-slug")) {
        headers.set("x-restaurant-slug", tenantSlug);
      }

      // Dodaj PIN header če manjka
      const pin = localStorage.getItem("icepos-si-pin");
      if (pin && !existingHeaders.has("x-operator-pin")) {
        headers.set("x-operator-pin", pin);
      }

      return originalFetch(input, { ...init, headers });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [tenantId, tenantSlug]);

  return null;
}
