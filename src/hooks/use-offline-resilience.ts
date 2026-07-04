// @ts-nocheck — pre-existing TS errors
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getQueuedInvoices,
  getQueueCount,
  type QueuedInvoice,
} from "@/lib/offline-queue";

export type ConnectionQuality = "online-fast" | "online-slow" | "offline";

/**
 * Hook za spremljanje:
 * 1. Online/offline stanja
 * 2. Hitrosti povezave (Network Information API)
 * 3. Čakajočih računov v offline fiscal queue
 */
export function useOfflineResilience() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [quality, setQuality] = useState<ConnectionQuality>("online-fast");
  const [queueCount, setQueueCount] = useState<number>(0);
  const [queuedInvoices, setQueuedInvoices] = useState<QueuedInvoice[]>([]);

  // Posodobi queue
  const refreshQueue = useCallback(() => {
    setQueueCount(getQueueCount());
    setQueuedInvoices(getQueuedInvoices());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    refreshQueue();

    // Online/offline event listenerji
    function handleOnline() {
      setIsOnline(true);
      setQuality("online-fast");
      // Ko se povezava vrne, poskusi fiskalizirati queue
      window.dispatchEvent(new CustomEvent("fiscal-queue-retry"));
    }

    function handleOffline() {
      setIsOnline(false);
      setQuality("offline");
    }

    // Network Information API (chrome only)
    const connection = (navigator as unknown as { connection?: { effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void } }).connection;
    function handleConnectionChange() {
      if (!navigator.onLine) {
        setQuality("offline");
        return;
      }
      const effType = (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType;
      if (effType === "slow-2g" || effType === "2g") {
        setQuality("online-slow");
      } else if (effType === "3g") {
        setQuality("online-slow");
      } else {
        setQuality("online-fast");
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (connection?.addEventListener) {
      connection.addEventListener("change", handleConnectionChange);
    }

    // Queue update listener
    function handleQueueUpdate() {
      refreshQueue();
    }
    window.addEventListener("fiscal-queue-updated", handleQueueUpdate);

    // Periodic queue refresh
    const interval = setInterval(refreshQueue, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("fiscal-queue-updated", handleQueueUpdate);
      if (connection?.addEventListener) {
        connection.removeEventListener("change", handleConnectionChange);
      }
      clearInterval(interval);
    };
  }, [refreshQueue]);

  return {
    isOnline,
    quality,
    queueCount,
    queuedInvoices,
    hasPending: queueCount > 0,
    refreshQueue,
  };
}
