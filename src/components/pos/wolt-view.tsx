"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bike,
  Check,
  X,
  Clock,
  Package,
  AlertCircle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { formatEUR, formatDateTime } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";

interface WoltOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  operator: string;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    menuItem: { name: string };
    note: string | null;
  }[];
  table: { name: string };
}

interface WoltStatus {
  configured: boolean;
  env: string | null;
  merchantId: string | null;
  venueId: string | null;
  webhookUrl: string | null;
  message: string;
}

export function WoltView() {
  const [status, setStatus] = useState<WoltStatus | null>(null);
  const [orders, setOrders] = useState<WoltOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, ordersRes] = await Promise.all([
        fetch("/api/wolt/status"),
        fetch("/api/wolt/orders"),
      ]);
      setStatus(await statusRes.json());
      setOrders(await ordersRes.json());
    } catch {
      toast.error("Napaka pri nalaganju Wolt podatkov");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Avto-osvežitev vsakih 15s (Wolt naročila so časovno občutljiva)
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleAction(orderId: string, action: "accept" | "reject" | "ready") {
    try {
      const res = await fetch(`/api/wolt/orders/${orderId}/action`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(
          action === "reject" ? { action, reason: "Zavrnjeno v POS" } : { action }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message || "Uspeh");
      load();
    } catch {
      toast.error("Napaka pri Wolt akciji");
    }
  }

  function copyWebhookUrl() {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      toast.success("Webhook URL kopiran");
    }
  }

  if (loading || !status) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam Wolt...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bike className="h-6 w-6 text-emerald-600" />
            Wolt integracija
          </h2>
          <p className="text-sm text-muted-foreground">
            Sprejemanje dostavnih naročil iz Wolta — avtomatska sinhronizacija
          </p>
        </div>
        {status.configured && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <span className="mr-1.5 flex h-2 w-2 rounded-full bg-emerald-500" />
            Povezan ({status.env})
          </Badge>
        )}
      </div>

      {!status.configured ? (
        <Card className="border-amber-300 bg-amber-50/50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                Wolt ni konfiguriran
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {status.message}
              </p>
              <div className="mt-4 rounded-lg bg-amber-100/50 p-3 text-xs dark:bg-amber-950/40">
                <p className="font-mono font-semibold">.env spremenljivke:</p>
                <pre className="mt-2 overflow-x-auto">
{`WOLT_CLIENT_ID=xxx
WOLT_CLIENT_SECRET=xxx
WOLT_MERCHANT_ID=xxx
WOLT_VENUE_ID=xxx (opcijsko)
WOLT_WEBHOOK_SECRET=xxx
WOLT_ENV=test`}
                </pre>
              </div>
              <a
                href="https://developer.wolt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                <ExternalLink className="h-3 w-3" />
                Pridobi Wolt Partner API dostop
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Webhook info */}
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
                <p className="mt-1 font-mono text-sm break-all">
                  {status.webhookUrl}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Merchant: {status.merchantId} · Venue: {status.venueId || "—"} · Env: {status.env}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="mr-1.5 h-3 w-3" />
                Kopiraj
              </Button>
            </div>
          </Card>

          {/* Wolt orders */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Wolt naročila ({orders.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Avto-osvežitev vsakih 15s
              </p>
            </div>

            {orders.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Ni Wolt naročil</p>
                <p className="text-sm text-muted-foreground">
                  Naročila iz Wolta se bodo samodejno prikazala tukaj in v KDS.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {orders.map((order) => (
                  <Card key={order.id} className="border-2 border-emerald-200 p-4 dark:border-emerald-800">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-emerald-600" />
                          <h4 className="font-bold">{order.operator}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          order.status === "open"
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                            : order.status === "paid"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border-border"
                        }
                      >
                        {order.status === "open" ? "Novo" : order.status === "paid" ? "Plačano" : order.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 border-t pt-2">
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-sm">
                          <span>
                            <span className="font-medium">{it.quantity}×</span> {it.menuItem.name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatEUR(it.unitPrice * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t pt-2">
                      <span className="text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {order.table.name}
                      </span>
                      <span className="font-bold text-emerald-600">
                        {formatEUR(order.total)}
                      </span>
                    </div>

                    {order.status === "open" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAction(order.id, "accept")}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Sprejmi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
                          onClick={() => handleAction(order.id, "reject")}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Zavrni
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako deluje Wolt integracija?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>1. <strong>Webhook</strong> — Wolt pošlje novo naročilo na <code>/api/wolt/webhook</code></p>
          <p>2. <strong>Avtomatska kreacija</strong> — naročilo se shrani v našo bazo z operatorjem "Wolt: ..."</p>
          <p>3. <strong>KDS</strong> — naročilo se prikaže v kuhinji (WOLT miza, sekcija "Dostava")</p>
          <p>4. <strong>Akcije</strong> — iz POS lahko sprejmeš/zavrneš/označiš kot pripravljeno</p>
          <p>5. <strong>FURS</strong> — ob plačilu se fiskalizira kot običajen račun</p>
          <p>• <strong>Reward</strong>: Prihranek 15-30 min na dan, manj napak, real-time statistika dostav</p>
        </div>
      </Card>
    </div>
  );
}
