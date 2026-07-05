import { useState, useEffect, useCallback } from "react";

// ============================================================
// useOfflineQueue — hook za prikaz stanja offline queue
// ============================================================
// Service Worker (public/sw.js) queue-a POST/PUT/DELETE zahtevke
// ko je offline. Ta hook omogoča UI-u prikaz števila čakajočih
// zahtevkov in manual replay.

export interface QueueStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
}

export function useOfflineQueue(): QueueStatus & {
  triggerSync: () => void;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when back online
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.controller?.postMessage({ type: "manual-sync" });
      }
      setLastSyncAt(new Date());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for SW sync-success messages
    if ("serviceWorker" in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "sync-success") {
          setPendingCount((c) => Math.max(0, c - 1));
          setLastSyncAt(new Date());
        }
      };
      navigator.serviceWorker.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerSync = useCallback(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({ type: "manual-sync" });
      setLastSyncAt(new Date());
    }
  }, []);

  return { isOnline, pendingCount, lastSyncAt, triggerSync };
}
