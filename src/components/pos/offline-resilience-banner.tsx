"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineResilience } from "@/hooks/use-offline-resilience";
import {
  getQueuedInvoices,
  dequeueInvoice,
  updateAttempt,
  getOldestInvoiceAgeHours,
} from "@/lib/offline-queue";
import { toast } from "sonner";
import { formatEUR } from "@/lib/types";

/**
 * Banner, ki prikazuje:
 * 1. Connection quality (fast/slow/offline)
 * 2. Čakajoče račune v fiscal queue
 * 3. Retry button ko je online
 */
export function OfflineResilienceBanner() {
  const { isOnline, quality, queueCount, hasPending, refreshQueue } = useOfflineResilience();
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Retry queue funkcija (useCallback za pravilne dependencies)
  const retryQueue = useCallback(async () => {
    if (!isOnline || queueCount === 0) return;
    setRetrying(true);
    const queue = getQueuedInvoices();
    let successCount = 0;
    let failCount = 0;

    for (const inv of queue) {
      try {
        // Poskusi fiskalizirati preko API
        const res = await fetch(`/api/orders/${inv.orderId}/fiscalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) {
          dequeueInvoice(inv.id);
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          updateAttempt(inv.id, err.error || "Napaka");
          failCount++;
        }
      } catch (e) {
        updateAttempt(inv.id, e instanceof Error ? e.message : "Napaka");
        failCount++;
        break; // prekini pri prvi napaki — verjetno še vedno brez povezave
      }
    }

    refreshQueue();

    if (successCount > 0) {
      toast.success(`${successCount} računov fiskaliziranih!`, {
        description: failCount > 0 ? `${failCount} še vedno čaka` : undefined,
        duration: 5000,
      });
    }
    setRetrying(false);
  }, [isOnline, queueCount, refreshQueue]);

  // Auto-retry ko se povezava vrne
  useEffect(() => {
    function handleRetry() {
      retryQueue();
    }
    window.addEventListener("fiscal-queue-retry", handleRetry);
    return () => window.removeEventListener("fiscal-queue-retry", handleRetry);
  }, [retryQueue]);

  // Ne prikaži ničesar če je vse OK
  if (isOnline && quality === "online-fast" && !hasPending) {
    return null;
  }

  const oldestAge = getOldestInvoiceAgeHours();

  return (
    <div className="border-b">
      {/* Offline / slow connection banner */}
      {!isOnline && (
        <div className="flex items-center justify-between gap-3 bg-rose-600 px-4 py-2 text-white">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 animate-pulse" />
            <p className="text-sm font-medium">
              Brez povezave — računi se shranjujejo lokalno in bodo fiskalizirani ko se povezava vrne
            </p>
          </div>
          {hasPending && (
            <Badge className="bg-white/20 text-white">
              <Clock className="mr-1 h-3 w-3" />
              {queueCount} čakajo
            </Badge>
          )}
        </div>
      )}

      {/* Slow connection banner */}
      {isOnline && quality === "online-slow" && (
        <div className="flex items-center gap-2 bg-amber-500 px-4 py-1.5 text-white">
          <Zap className="h-3.5 w-3.5" />
          <p className="text-xs font-medium">
            Počasna povezava — aplikacija deluje, a je odzivnost lahko zamujena
          </p>
        </div>
      )}

      {/* Pending fiscalization queue */}
      {hasPending && isOnline && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 px-4 py-2 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {queueCount} računov čaka na fiskalizacijo
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Najstarejši: pred {Math.round(oldestAge)} urami
                {oldestAge > 24 && " ⚠️ FURS dovoljuje do 48h zamudo"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
              onClick={() => setShowDetails(!showDetails)}
            >
              Podrobnosti
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={retryQueue}
              disabled={retrying}
            >
              {retrying ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Fiskaliziraj
            </Button>
          </div>
        </div>
      )}

      {/* Details panel */}
      {showDetails && hasPending && (
        <div className="max-h-64 overflow-y-auto border-t border-amber-200 bg-amber-50/50 p-2 dark:border-amber-900 dark:bg-amber-950/20">
          {getQueuedInvoices().map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-2 text-xs"
            >
              <div className="flex items-center gap-2">
                {inv.error ? (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatEUR(inv.total)} · {inv.operator}
                    {inv.attempts > 0 && ` · ${inv.attempts}× poskus`}
                    {inv.error && ` · ${inv.error}`}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(inv.createdAt).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
