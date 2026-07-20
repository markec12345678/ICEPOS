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
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Search,
  Phone,
  Euro,
  Calendar,
  UtensilsCrossed,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface PreOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  note: string | null;
}

interface PreOrder {
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
  preOrderStatus: string;
  pickupDate: string | null;
  pickupTime: string | null;
  customerNote: string | null;
  items: PreOrderItem[];
}

interface Summary {
  total: number;
  pending: number;
  preparing: number;
  ready: number;
  pickedUp: number;
  cancelled: number;
  todayPickups: number;
  totalRevenue: number;
}

interface PreOrdersData {
  items: PreOrder[];
  summary: Summary;
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PreOrdersView() {
  const [data, setData] = useState<PreOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<PreOrder | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFilter) params.set("date", dateFilter);
      const url = `/api/pre-orders${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju prednaročil");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/pre-orders", {
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
          <h2 className="text-2xl font-bold">Prednaročila</h2>
          <p className="text-sm text-muted-foreground">Prednaročila za prevzem</p>
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
          <ShoppingBag className="h-6 w-6 text-emerald-600" />
          Prednaročila
        </h2>
        <p className="text-sm text-muted-foreground">
          Prednaročila za prevzem s predhodnim plačilom in časom priprave
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
              <p className="text-xs text-muted-foreground">{s.todayPickups} danes</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Na čakanju</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">V pripravi</p>
              <p className="text-2xl font-bold text-blue-600">{s.preparing}</p>
              <p className="text-xs text-muted-foreground">{s.ready} pripravljeno</p>
            </div>
            <ChefHat className="h-8 w-8 text-blue-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Prihodek</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatEUR(s.totalRevenue)}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{s.pickedUp} prevzetih</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči po stranki, telefonu..."
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
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Seznam prednaročil */}
      {data.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Ni prednaročil"
          description="Prednaročila se ustvarijo preko QR kode ali spletne strani"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((order) => {
            const cfg = STATUS_CONFIG[order.preOrderStatus] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const isToday = order.pickupDate === new Date().toISOString().slice(0, 10);
            return (
              <Card key={order.id} className="flex flex-col p-4">
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

                {/* Prevzem info */}
                <div className="mb-3 space-y-1 text-xs">
                  {order.pickupDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className={isToday ? "font-medium text-amber-600" : ""}>
                        Prevzem: {formatDate(order.pickupDate)}
                        {isToday && " (danes)"}
                      </span>
                    </div>
                  )}
                  {order.pickupTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Ob: {order.pickupTime}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <a href={`tel:${order.customerPhone}`} className="text-blue-600">
                        {order.customerPhone}
                      </a>
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

                {order.customerNote && (
                  <p className="mb-3 rounded bg-amber-50 p-2 text-xs italic dark:bg-amber-950/20">
                    "{order.customerNote}"
                  </p>
                )}

                {/* Total + payment */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold">{formatEUR(order.total)}</span>
                  {order.paidAt ? (
                    <Badge variant="outline" className="text-emerald-600">
                      Plačano
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600">
                      Čaka plačilo
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1">
                  {order.preOrderStatus === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(order.id, "preparing")}
                      disabled={updatingId === order.id}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ChefHat className="mr-1 h-3 w-3" />
                      Začni
                    </Button>
                  )}
                  {order.preOrderStatus === "preparing" && (
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
                  {order.preOrderStatus === "ready" && (
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
                  {(order.preOrderStatus === "pending" || order.preOrderStatus === "preparing") && (
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
              <ShoppingBag className="h-5 w-5" />
              Prednaročilo {selected?.invoiceNumber || ""}
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
                  <p className="text-xs text-muted-foreground">Datum prevzema</p>
                  <p className="font-medium">{formatDate(selected.pickupDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Čas prevzema</p>
                  <p className="font-medium">{selected.pickupTime || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum naročila</p>
                  <p className="font-medium">{formatDateTime(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={STATUS_CONFIG[selected.preOrderStatus]?.className}>
                    {STATUS_CONFIG[selected.preOrderStatus]?.label}
                  </Badge>
                </div>
              </div>

              {selected.customerNote && (
                <div className="rounded border bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Opomba stranke</p>
                  <p className="mt-1 italic">"{selected.customerNote}"</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Postavke ({selected.items.length})
                </p>
                <div className="rounded border">
                  <table className="w-full text-sm">
                    <tbody>
                      {selected.items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            {item.quantity}× {item.name}
                            {item.note && (
                              <p className="text-[10px] text-muted-foreground">{item.note}</p>
                            )}
                          </td>
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
