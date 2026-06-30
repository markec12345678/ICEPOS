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
  Truck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatEUR, formatDateTime } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";
import { getChannelInfo } from "@/lib/deliverect";

interface DeliverectOrder {
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

interface DeliverectStatus {
  configured: boolean;
  env: string | null;
  locationId: string | null;
  webhookUrl: string | null;
  supportedChannels: { id: string; label: string; icon: string }[];
  message: string;
}

export function DeliverectView() {
  const [status, setStatus] = useState<DeliverectStatus | null>(null);
  const [orders, setOrders] = useState<DeliverectOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, ordersRes] = await Promise.all([
        fetch("/api/deliverect/status"),
        fetch("/api/deliverect/orders"),
      ]);
      setStatus(await statusRes.json());
      setOrders(await ordersRes.json());
    } catch {
      toast.error("Napaka pri nalaganju Deliverect podatkov");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // avto-osvežitev vsakih 15s
    return () => clearInterval(interval);
  }, [load]);

  async function handleAction(orderId: string, action: "accept" | "reject" | "ready" | "pickup") {
    try {
      const res = await fetch(`/api/deliverect/orders/${orderId}/action`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message || "Uspeh");
      load();
    } catch {
      toast.error("Napaka pri Deliverect akciji");
    }
  }

  function copyWebhookUrl() {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      toast.success("Webhook URL kopiran");
    }
  }

  function toggleExpand(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  // Izlušči kanal iz operatorja (npr. "Deliverect: ubereats #123" → "ubereats")
  function extractChannel(operator: string): string {
    const match = operator.match(/Deliverect:\s*(\w+)/);
    return match ? match[1] : "unknown";
  }

  if (loading || !status) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam Deliverect...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Truck className="h-6 w-6 text-blue-600" />
            Deliverect — dostavne platforme
          </h2>
          <p className="text-sm text-muted-foreground">
            Agregator vseh dostavnih platform (UberEats, DoorDash, Glovo, Bolt, itd.)
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
                Deliverect ni konfiguriran
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {status.message}
              </p>
              <div className="mt-4 rounded-lg bg-amber-100/50 p-3 text-xs dark:bg-amber-950/40">
                <p className="font-mono font-semibold">.env spremenljivke:</p>
                <pre className="mt-2 overflow-x-auto">
{`DELIVERECT_CLIENT_ID=xxx
DELIVERECT_CLIENT_SECRET=xxx
DELIVERECT_LOCATION_ID=xxx
DELIVERECT_WEBHOOK_SECRET=xxx
DELIVERECT_ENV=test`}
                </pre>
              </div>
              <a
                href="https://developer.deliverect.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                <ExternalLink className="h-3 w-3" />
                Pridobi Deliverect API dostop
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
                  Location: {status.locationId} · Env: {status.env}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="mr-1.5 h-3 w-3" />
                Kopiraj
              </Button>
            </div>
          </Card>

          {/* Podprte platforme */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Podprte dostavne platforme</h3>
            <div className="flex flex-wrap gap-2">
              {status.supportedChannels.map((ch) => (
                <Badge key={ch.id} variant="outline" className="gap-1.5 text-sm">
                  <span className="text-base">{ch.icon}</span>
                  {ch.label}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Orders */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Naročila iz dostave ({orders.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Avto-osvežitev vsakih 15s
              </p>
            </div>

            {orders.length === 0 ? (
              <Card className="flex flex-col items-center justify-center p-8 text-center">
                <Package className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="font-medium">Ni dostavnih naročil</p>
                <p className="text-sm text-muted-foreground">
                  Naročila iz vseh dostavnih platform (UberEats, DoorDash, itd.) se bodo samodejno prikazala tukaj.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const channel = extractChannel(order.operator);
                  const chInfo = getChannelInfo(channel);
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <Card key={order.id} className="overflow-hidden border-2 border-blue-200 dark:border-blue-800">
                      <div
                        className="flex cursor-pointer items-start justify-between p-4"
                        onClick={() => toggleExpand(order.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{chInfo.icon}</span>
                            <div>
                              <h4 className="font-bold">{order.operator}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(order.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
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
                            {order.status === "open" ? "Novo" : order.status === "paid" ? "Prevzeto" : order.status}
                          </Badge>
                          <span className="font-bold text-blue-600">{formatEUR(order.total)}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-4">
                          <div className="space-y-1">
                            {order.items.map((it) => (
                              <div key={it.id} className="flex justify-between text-sm">
                                <span>
                                  <span className="font-medium">{it.quantity}×</span> {it.menuItem.name}
                                  {it.note && (
                                    <span className="ml-1 text-xs italic text-muted-foreground">
                                      ({it.note})
                                    </span>
                                  )}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatEUR(it.unitPrice * it.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {order.status === "open" && (
                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                                onClick={() => handleAction(order.id, "ready")}
                              >
                                <Clock className="mr-1 h-3 w-3" />
                                Pripravljeno
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => handleAction(order.id, "pickup")}
                              >
                                <Bike className="mr-1 h-3 w-3" />
                                Prevzeto
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
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kaj je Deliverect?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Deliverect</strong> je platforma ki povezuje POS z vsemi dostavnimi aplikacijami.</p>
          <p>• Podpira: <strong>Uber Eats, DoorDash, Just Eat, Takeaway, Glovo, Bolt Food, Wolt</strong> in lastne spletne naročila.</p>
          <p>• <strong>Samodejno</strong>: nova naročila pridejo prek webhook-a v našo bazo in KDS.</p>
          <p>• <strong>Statusi</strong>: Sprejmi → Pripravljeno → Prevzeto (avto-fiskalizacija).</p>
          <p>• <strong>Enoten vmesnik</strong>: vse dostavne platforme na enem mestu, brez ročnega prepisovanja.</p>
          <p>• <strong>ROI</strong>: prihranek 30-60 min/dan, manj napak, real-time statistika vseh kanalov.</p>
        </div>
      </Card>
    </div>
  );
}
