"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Smartphone,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Search,
  Euro,
  Phone,
  UtensilsCrossed,
  Bell,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface MobileOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface MobileOrder {
  id: string;
  invoiceNumber: string | null;
  customerName: string;
  customerPhone: string | null;
  tableName: string;
  total: number;
  itemCount: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  mobileStatus: string;
  pickupTime: string | null;
  items: MobileOrderItem[];
}

interface MobileOrdersData {
  items: MobileOrder[];
  summary: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
    pickedUp: number;
    cancelled: number;
    totalRevenue: number;
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: {
    label: "Na čakanju",
    icon: Clock,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  preparing: {
    label: "V pripravi",
    icon: ChefHat,
    className:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  },
  ready: {
    label: "Pripravljeno",
    icon: PackageCheck,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  pickedup: {
    label: "Prevzeto",
    icon: CheckCircle2,
    className:
      "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  cancelled: {
    label: "Preklicano",
    icon: XCircle,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MobileOrdersView() {
  const [data, setData] = useState<MobileOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<MobileOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = `/api/mobile-orders${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju mobilnih naročil");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/mobile-orders", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(`✓ Status posodobljen na "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
      setSelected(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri posodabljanju");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Mobilna naročila</h2>
          <p className="text-sm text-muted-foreground">QR prednaročila s plačilom</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Smartphone className="h-6 w-6 text-emerald-600" />
          Mobilna naročila
        </h2>
        <p className="text-sm text-muted-foreground">
          QR prednaročila s predhodnim plačilom — spremljanje priprave in prevzema
        </p>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <Smartphone className="h-7 w-7 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Čakanje</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.pending}</p>
            </div>
            <Clock className="h-7 w-7 text-amber-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">V pripravi</p>
              <p className="text-2xl font-bold text-blue-600">{s.preparing}</p>
            </div>
            <ChefHat className="h-7 w-7 text-blue-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Pripravljeno</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.ready}</p>
            </div>
            <PackageCheck className="h-7 w-7 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Prevzeto</p>
              <p className="text-2xl font-bold text-emerald-600">{s.pickedUp}</p>
            </div>
            <CheckCircle2 className="h-7 w-7 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Prihodek</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalRevenue)}</p>
            </div>
            <Euro className="h-7 w-7 text-emerald-600/40" />
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči po stranki, mizi, št. računa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi statusi</SelectItem>
            <SelectItem value="pending">Na čakanju</SelectItem>
            <SelectItem value="preparing">V pripravi</SelectItem>
            <SelectItem value="ready">Pripravljeno</SelectItem>
            <SelectItem value="pickedup">Prevzeto</SelectItem>
            <SelectItem value="cancelled">Preklicano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Seznam naročil */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="Ni mobilnih naročil"
          description="Mobilna naročila se ustvarijo preko QR kode ali povezave"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((order) => {
            const cfg = STATUS_CONFIG[order.mobileStatus] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <Card
                key={order.id}
                className="flex flex-col p-4"
              >
                {/* Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline" className={cfg.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* Info */}
                <div className="mb-3 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Bell className="h-3 w-3" />
                    Prevzem: {order.tableName}
                  </div>
                  {order.pickupTime && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Čas prevzema: {order.pickupTime}
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {order.customerPhone}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="mb-3 flex-1 rounded border bg-muted/20 p-2">
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                    <UtensilsCrossed className="h-3 w-3" />
                    Postavke ({order.itemCount})
                  </p>
                  <div className="space-y-0.5 text-xs">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="truncate">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {formatEUR(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <p className="text-[10px] text-muted-foreground">
                        + {order.items.length - 4} več...
                      </p>
                    )}
                  </div>
                </div>

                {/* Total + payment */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold">{formatEUR(order.total)}</span>
                  <div className="flex gap-1">
                    {order.paidAt ? (
                      <Badge variant="outline" className="text-emerald-600">
                        Plačano
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600">
                        Čaka plačilo
                      </Badge>
                    )}
                    {order.paymentMethod && (
                      <Badge variant="secondary" className="text-xs">
                        {order.paymentMethod}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  {order.mobileStatus === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(order.id, "preparing")}
                      disabled={updatingId === order.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ChefHat className="mr-1 h-3 w-3" />
                      Začni pripravo
                    </Button>
                  )}
                  {order.mobileStatus === "preparing" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(order.id, "ready")}
                      disabled={updatingId === order.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <PackageCheck className="mr-1 h-3 w-3" />
                      Pripravljeno
                    </Button>
                  )}
                  {order.mobileStatus === "ready" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(order.id, "pickedup")}
                      disabled={updatingId === order.id}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Prevzeto
                    </Button>
                  )}
                  {(order.mobileStatus === "pending" || order.mobileStatus === "preparing") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(order.id, "cancelled")}
                      disabled={updatingId === order.id}
                      className="text-rose-600"
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Prekliči
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(order)}>
                    Podrobnosti
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Naročilo {selected?.invoiceNumber || ""}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Stranka</p>
                  <p className="font-medium">{selected.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  <p className="font-medium">{selected.customerPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prevzem</p>
                  <p className="font-medium">{selected.tableName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Čas prevzema</p>
                  <p className="font-medium">{selected.pickupTime || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">{formatDateTime(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={STATUS_CONFIG[selected.mobileStatus]?.className}>
                    {STATUS_CONFIG[selected.mobileStatus]?.label}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Postavke ({selected.items.length})
                </p>
                <div className="rounded border">
                  <table className="w-full text-sm">
                    <tbody>
                      {selected.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">{item.quantity}× {item.name}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {formatEUR(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatEUR(item.unitPrice * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-muted/20">
                      <tr>
                        <td className="px-3 py-2 font-bold" colSpan={2}>Skupaj</td>
                        <td className="px-3 py-2 text-right font-bold">{formatEUR(selected.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selected.paidAt && (
                <div className="rounded border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  ✓ Plačano {formatDateTime(selected.paidAt)} ({selected.paymentMethod})
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
