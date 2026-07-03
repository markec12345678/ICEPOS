"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { formatTime } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChefHat,
  CheckCircle2,
  Bell,
  Clock,
  Flame,
  Utensils,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { STATIONS, categoryToStation, getStationConfig, type KitchenStation } from "@/lib/kds-routing";
import { StationPerformance } from "@/components/pos/station-performance";

interface KitchenItem {
  menuItemId: string;
  name: string;
  quantity: number;
  note?: string | null;
  category?: string;
}

interface KitchenOrder {
  id: string;
  orderId: string;
  tableNumber: number;
  tableName: string;
  items: KitchenItem[];
  status: "new" | "preparing" | "ready" | "served";
  createdAt: string;
  updatedAt: string;
  operator: string;
  priority?: boolean;
}

interface KitchenStats {
  new: number;
  preparing: number;
  ready: number;
  total: number;
}

export function KitchenDisplayView() {
  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [activeStation, setActiveStation] = useState<KitchenStation>("all");
  const [stats, setStats] = useState<KitchenStats>({
    new: 0,
    preparing: 0,
    ready: 0,
    total: 0,
  });
  const [, setTick] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Real-time tick vsako sekundo — za posodobitev timerjev v OrderCard
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // V development: Next.js na :3000, Caddy na :81 — poveži se prek Caddy
    // V produkciji: aplikacija za Caddy, relativna pot zadostuje
    const isDev =
      typeof window !== "undefined" && window.location.port === "3000";
    const socketUrl = isDev
      ? `${window.location.protocol}//${window.location.hostname}:81`
      : "";

    const s = io(`${socketUrl}/?XTransformPort=3003`, {
      transports: ["websocket", "polling"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    s.on("kitchen:sync", (syncOrders: KitchenOrder[]) => {
      setOrders(syncOrders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    });

    s.on("order:new", (order: KitchenOrder) => {
      setOrders((prev) => [...prev, order]);
      toast.info(`🔔 Novo naročilo: Miza ${order.tableName}`, {
        description: `${order.items.length} postavk`,
      });
    });

    s.on("order:status", (data: { orderId: string; status: string; updatedAt: string }) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === data.orderId
            ? { ...o, status: data.status as KitchenOrder["status"], updatedAt: data.updatedAt }
            : o
        )
      );
    });

    s.on("kitchen:stats", (st: KitchenStats) => setStats(st));

    s.on("order:recall", (data: { tableName: string; item?: string }) => {
      toast.success(`🔔 Klic iz kuhinje: Miza ${data.tableName}`, {
        description: data.item || "Jedi so pripravljene za prevzem",
      });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  const updateStatus = useCallback(
    (orderId: string, status: KitchenOrder["status"]) => {
      socketRef.current?.emit("order:status", { orderId, status });

      // Ko je "served" (kuhinja pozove mizo), pošlji recall obvestilo vsem
      if (status === "served") {
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          socketRef.current?.emit("order:recall", {
            orderId,
            tableName: order.tableName,
            item: `Miza ${order.tableName} — jedi pripravljene za prevzem`,
          });
        }
      }
    },
    [orders]
  );

  // Samodejno odstrani "served" po 5 sekundah
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) => {
        const now = Date.now();
        return prev.filter((o) => {
          if (o.status === "served") {
            const servedAt = new Date(o.updatedAt).getTime();
            return now - servedAt < 5000;
          }
          return true;
        });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const columns: {
    title: string;
    status: KitchenOrder["status"];
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }[] = [
    { title: "Nova", status: "new", icon: Bell, iconColor: "text-amber-600" },
    { title: "V pripravi", status: "preparing", icon: Flame, iconColor: "text-sky-600" },
    { title: "Pripravljeno", status: "ready", icon: CheckCircle2, iconColor: "text-emerald-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Kuhinja Display (KOT)
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time naročila prek WebSocket
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              connected
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
            )}
          >
            {connected ? (
              <>
                <Wifi className="h-3.5 w-3.5" />
                Povezano
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" />
                Brez povezave
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Stat kartice */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Nova" count={stats.new} icon={Bell} accent="amber" />
        <StatCard label="V pripravi" count={stats.preparing} icon={Flame} accent="blue" />
        <StatCard label="Pripravljeno" count={stats.ready} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Skupaj" count={stats.total} icon={Utensils} accent="neutral" />
      </div>

      {/* Station filter — Multi-Step KDS Routing */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Postaja (routing):</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveStation("all")}
            className={cn(
              "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
              activeStation === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-muted"
            )}
          >
            🍽️ Vse postaje
          </button>
          {STATIONS.map((station) => {
            // Preštej item-e za to postajo
            const stationItemCount = orders.reduce((s, o) => {
              return s + o.items.filter((it) => categoryToStation(it.category || "") === station.id).length;
            }, 0);
            return (
              <button
                key={station.id}
                onClick={() => setActiveStation(station.id)}
                className={cn(
                  "rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all",
                  activeStation === station.id
                    ? station.color
                    : "border-border hover:bg-muted"
                )}
              >
                {station.icon} {station.label}
                {stationItemCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-black/10 px-1.5 text-xs">
                    {stationItemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!connected && (
        <Card className="border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Kuhinjski servis ni povezan. Pošlji testno naročilo iz blagajne
              (gumb "Kuhinja") ali počakaj na ponovno povezavo.
            </p>
          </div>
        </Card>
      )}

      {/* Kanban stolpci */}
      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          const Icon = col.icon;
          return (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", col.iconColor)} />
                  <h3 className="font-semibold">{col.title}</h3>
                </div>
                <Badge variant="secondary">{colOrders.length}</Badge>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <Card className="border-dashed p-8 text-center">
                    <p className="text-xs text-muted-foreground">Prazen</p>
                  </Card>
                ) : (
                  colOrders.map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={updateStatus}
                      activeStation={activeStation}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Station performance analitika */}
      <Separator className="my-4" />
      <StationPerformance />
    </div>
  );
}

function KitchenOrderCard({
  order,
  onStatusChange,
  activeStation,
}: {
  order: KitchenOrder;
  onStatusChange: (id: string, status: KitchenOrder["status"]) => void;
  activeStation: KitchenStation;
}) {
  const elapsed = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 1000
  );
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // 3-stopinjska urgensa: normal (<10m), warning (10-15m), urgent (>15m)
  const urgency: "normal" | "warning" | "urgent" =
    elapsed > 900 ? "urgent" : elapsed > 600 ? "warning" : "normal";

  // Standardni čas priprave: 15 min (900s). Progress bar do 100%.
  const prepProgress = Math.min(100, (elapsed / 900) * 100);

  // Filtriraj item-e po aktivni postaji
  const filteredItems = activeStation === "all"
    ? order.items
    : order.items.filter((it) => categoryToStation(it.category || "") === activeStation);

  // Če na tej postaji ni item-ov, ne prikaži kartice
  if (filteredItems.length === 0) return null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4 transition-all",
        order.status === "new" && "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10",
        order.status === "preparing" && "border-sky-300 bg-sky-50/30 dark:border-sky-800 dark:bg-sky-950/10",
        order.status === "ready" && "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10",
        urgency === "warning" && order.status !== "ready" && "ring-2 ring-amber-400",
        urgency === "urgent" && order.status !== "ready" && "ring-2 ring-rose-500 animate-pulse"
      )}
    >
      {/* Urgency progress bar na vrhu */}
      {order.status !== "ready" && (
        <div className="absolute inset-x-0 top-0 h-1 bg-muted/30">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              urgency === "urgent" ? "bg-rose-500" : urgency === "warning" ? "bg-amber-500" : "bg-sky-500"
            )}
            style={{ width: `${prepProgress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold">{order.tableName}</h4>
            {order.priority && (
              <Badge variant="destructive" className="text-[10px]">
                PREDNOST
              </Badge>
            )}
            {urgency === "urgent" && order.status !== "ready" && (
              <Badge variant="destructive" className="animate-pulse text-[10px]">
                ZAMUDA!
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {order.operator} &middot;{" "}
            {formatTime(order.createdAt)}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-mono tabular-nums",
            urgency === "urgent" && order.status !== "ready"
              ? "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
              : urgency === "warning" && order.status !== "ready"
              ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
              : "border-border"
          )}
        >
          <Clock className="h-3 w-3" />
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Badge>
      </div>

      <Separator className="my-2" />

      {/* Postavke */}
      <div className="space-y-1.5">
        {filteredItems.map((it, i) => {
          const station = getStationConfig(categoryToStation(it.category || ""));
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Badge variant="secondary" className="mt-0.5 min-w-[28px] justify-center font-mono">
                {it.quantity}×
              </Badge>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{it.name}</p>
                  {station && activeStation === "all" && (
                    <span className="text-xs" title={station.label}>
                      {station.icon}
                    </span>
                  )}
                </div>
                {it.note && (
                  <p className="text-xs italic text-amber-700 dark:text-amber-400">
                    ⚠ {it.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator className="my-3" />

      {/* Akcijski gumbi */}
      <div className="grid grid-cols-1 gap-2">
        {order.status === "new" && (
          <Button
            size="sm"
            onClick={() => onStatusChange(order.id, "preparing")}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <Flame className="mr-2 h-4 w-4" />
            Začni pripravo
          </Button>
        )}
        {order.status === "preparing" && (
          <Button
            size="sm"
            onClick={() => onStatusChange(order.id, "ready")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Pripravljeno
          </Button>
        )}
        {order.status === "ready" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(order.id, "served")}
          >
            <Bell className="mr-2 h-4 w-4" />
            Pozovi mizo
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatCard({
  label,
  count,
  icon: Icon,
  accent,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "amber" | "blue" | "emerald" | "neutral";
}) {
  const accentClasses = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400",
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    neutral: "bg-muted text-foreground",
  };
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            accentClasses[accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold">{count}</p>
    </Card>
  );
}
