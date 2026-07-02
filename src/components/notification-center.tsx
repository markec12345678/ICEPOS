"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  AlertTriangle,
  ShoppingBag,
  CalendarCheck,
  Bike,
  Package,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/stores/pos-store";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "low_stock" | "new_order" | "reservation" | "delivery" | "shift";
  title: string;
  description: string;
  icon: "alert" | "order" | "calendar" | "bike" | "package";
  action?: () => void;
  actionLabel?: string;
  timestamp: string;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const setActiveView = usePosStore((s) => s.setActiveView);

  const load = useCallback(async () => {
    try {
      const notifs: Notification[] = [];
      const now = new Date().toISOString();

      // 1. Low stock
      try {
        const res = await fetch("/api/inventory/low-stock");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            notifs.push({
              id: "low_stock",
              type: "low_stock",
              title: `${data.length} artiklov z nizko zalogo`,
              description: data.slice(0, 3).map((i: { name: string }) => i.name).join(", ") + (data.length > 3 ? ` +${data.length - 3}` : ""),
              icon: "alert",
              action: () => setActiveView("inventory"),
              actionLabel: "Uredi zalogo",
              timestamp: now,
            });
          }
        }
      } catch { /* ignore */ }

      // 2. Open orders (mize z odprtimi naročili)
      try {
        const res = await fetch("/api/orders?status=open");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            notifs.push({
              id: "open_orders",
              type: "new_order",
              title: `${data.length} odprtih naročil`,
              description: "Mize z aktivnimi računi",
              icon: "order",
              action: () => setActiveView("tables"),
              actionLabel: "Prikaži mize",
              timestamp: now,
            });
          }
        }
      } catch { /* ignore */ }

      // 3. Today's reservations
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/reservations?date=${today}&status=confirmed`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            notifs.push({
              id: "reservations",
              type: "reservation",
              title: `${data.length} rezervacij danes`,
              description: data.slice(0, 3).map((r: { customerName: string; time: string }) => `${r.customerName} ${r.time}`).join(", "),
              icon: "calendar",
              action: () => setActiveView("reservations"),
              actionLabel: "Prikaži rezervacije",
              timestamp: now,
            });
          }
        }
      } catch { /* ignore */ }

      // 4. Active shift check
      try {
        const res = await fetch("/api/shifts/active");
        if (res.ok) {
          const data = await res.json();
          if (!data) {
            notifs.push({
              id: "no_shift",
              type: "shift",
              title: "Smena ni odprta",
              description: "Odpri smeno za začetek dela",
              icon: "package",
              action: () => setActiveView("shift"),
              actionLabel: "Odpri smeno",
              timestamp: now,
            });
          }
        }
      } catch { /* ignore */ }

      setNotifications(notifs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [setActiveView]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // osveži vsakih 30s
    return () => clearInterval(interval);
  }, [load]);

  const iconMap = {
    alert: AlertTriangle,
    order: ShoppingBag,
    calendar: CalendarCheck,
    bike: Bike,
    package: Package,
  };

  const colorMap = {
    alert: "text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400",
    order: "text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
    calendar: "text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400",
    bike: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
    package: "text-purple-600 bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400",
  };

  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          title="Obvestila"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4" />
              Obvestila
            </h3>
            {count > 0 && (
              <Badge variant="outline" className="text-xs">
                {count} novo
              </Badge>
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nalagam...
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center p-6 text-center">
              <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Vse v redu!
              </p>
              <p className="text-xs text-muted-foreground">
                Ni novih obvestil
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const Icon = iconMap[notif.icon];
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (notif.action) {
                        notif.action();
                        setOpen(false);
                      }
                    }}
                    className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", colorMap[notif.icon])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notif.description}
                      </p>
                      {notif.actionLabel && (
                        <span className="mt-1 inline-block text-xs font-medium text-primary">
                          {notif.actionLabel} →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {count > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                load();
                toast.success("Obvestila osvežena");
              }}
            >
              <Clock className="mr-1.5 h-3 w-3" />
              Osveži
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

