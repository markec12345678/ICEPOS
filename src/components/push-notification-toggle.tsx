"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, BellOff, Loader2, Check, AlertCircle } from "lucide-react";
import {
  isPushSupported,
  isPushConfigured,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  type PushStatus,
} from "@/lib/push-notifications";

export function PushNotificationToggle() {
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }
      if (!isPushConfigured()) {
        setStatus("not-configured");
        return;
      }
      const subscribed = await isPushSubscribed();
      setStatus(subscribed ? "subscribed" : "not-subscribed");
    }
    check();
  }, []);

  async function toggle() {
    setLoading(true);
    try {
      if (status === "subscribed") {
        // Odjavi
        const success = await unsubscribeFromPush();
        if (success) {
          setStatus("not-subscribed");
          toast.success("Odjavljen od push obvestil");
          // Pošlji serverju
          await fetch("/api/push/subscribe", { method: "DELETE" }).catch(() => {});
        } else {
          toast.error("Napaka pri odjavi");
        }
      } else {
        // Prijavi
        const sub = await subscribeToPush();
        if (sub) {
          setStatus("subscribed");
          toast.success("Prijavljen na push obvestila!");
          // Shrani na server
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: JSON.stringify(sub),
            }),
          }).catch(() => {});
        } else {
          toast.error("Napaka pri prijavi — preveri dovoljenja");
        }
      }
    } catch (e) {
      toast.error("Napaka: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "unsupported") {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
        <BellOff className="mx-auto mb-1 h-4 w-4" />
        Push obvestila niso podprta v tem brskalniku
      </div>
    );
  }

  if (status === "not-configured") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="font-medium">Push obvestila niso konfigurirana</span>
        </div>
        <p className="mt-1 text-amber-600 dark:text-amber-500">
          Dodaj NEXT_PUBLIC_VAPID_PUBLIC_KEY v .env za omogočanje
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "subscribed" ? (
            <Bell className="h-4 w-4 text-emerald-600" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {status === "subscribed" ? "Push obvestila omogočena" : "Push obvestila"}
            </p>
            <p className="text-xs text-muted-foreground">
              {status === "subscribed"
                ? "Prejemali boste obvestila o nagradah in naročilih"
                : "Omogoči za obvestila o nagradah"}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={status === "subscribed" ? "outline" : "default"}
          disabled={loading}
          onClick={toggle}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status === "subscribed" ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              Omogočeno
            </>
          ) : (
            "Omogoči"
          )}
        </Button>
      </div>
    </div>
  );
}
