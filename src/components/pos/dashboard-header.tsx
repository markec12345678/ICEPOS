"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { usePosStore } from "@/stores/pos-store";
import { formatDateTime, formatEUR } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCircle,
  CalendarDays,
  Clock,
  Play,
  Plus,
  Receipt,
  ChefHat,
  ArrowRight,
  TrendingUp,
  Banknote,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveShiftStats {
  shift: {
    id: string;
    operator: string;
    startTime: string;
    startCash: number;
  } | null;
  revenue: number;
  ordersCount: number;
  cashRevenue: number;
  cardRevenue: number;
  expectedCash: number;
}

interface Shift {
  id: string;
  operator: string;
  startTime: string;
  status: "open" | "closed";
}

interface Reservation {
  id: string;
  customerName: string;
  partySize: number;
  time: string;
  table: { name: string };
  note: string | null;
}

export function DashboardHeader() {
  const { data: shift } = useFetch<Shift | null>("/api/shifts/active");
  const { data: reservations } = useFetch<Reservation[]>(
    `/api/reservations?date=${new Date().toISOString().slice(0, 10)}&status=confirmed`
  );
  const setActiveView = usePosStore((s) => s.setActiveView);

  // Live polling za prihodek aktivne smene (vsakih 30s)
  const [liveStats, setLiveStats] = useState<LiveShiftStats | null>(null);
  useEffect(() => {
    let active = true;
    async function fetchStats() {
      try {
        const r = await fetch("/api/shifts/live-stats");
        if (!r.ok) return;
        const json = (await r.json()) as LiveShiftStats;
        if (active) setLiveStats(json);
      } catch {
        // ignore
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  const upcoming = (reservations || [])
    .filter((r) => r.time >= nowStr)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Aktivna smena z live prihodkom */}
      <Card className={cn("p-4", shift ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/10" : "border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              shift ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
            )}>
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktivna smena</p>
              {shift ? (
                <p className="text-sm font-bold">{shift.operator}</p>
              ) : (
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  Ni aktivne
                </p>
              )}
            </div>
          </div>
          {shift ? (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              V teku
            </Badge>
          ) : (
            <Button size="sm" onClick={() => setActiveView("shift")} className="bg-emerald-600 hover:bg-emerald-700 h-7">
              <Play className="mr-1 h-3 w-3" />
              Začni
            </Button>
          )}
        </div>
        {shift && (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Od {formatDateTime(shift.startTime)}
            </p>
            {liveStats && liveStats.shift && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Prihodek
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatEUR(liveStats.revenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Računov</p>
                  <p className="text-sm font-bold">{liveStats.ordersCount}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Banknote className="h-3 w-3" />
                    Gotovina
                  </p>
                  <p className="text-xs font-medium">
                    {formatEUR(liveStats.cashRevenue)}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CreditCard className="h-3 w-3" />
                    Kartica
                  </p>
                  <p className="text-xs font-medium">
                    {formatEUR(liveStats.cardRevenue)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Prihajajoče rezervacije */}
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rezervacije danes</p>
              <p className="text-sm font-bold">{reservations?.length || 0} skupaj</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setActiveView("reservations")} className="h-7">
            Vse
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            Ni prihajajočih rezervacij.
          </p>
        ) : (
          <div className="space-y-1">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono font-semibold">{r.time}</span>
                  <span className="truncate">{r.customerName}</span>
                </div>
                <span className="text-muted-foreground">{r.table.name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hitre akcije */}
      <Card className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hitre akcije</p>
            <p className="text-sm font-bold">Navigacija</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setActiveView("tables")} className="h-8 flex-col gap-0.5 py-1">
            <Receipt className="h-3.5 w-3.5" />
            <span className="text-[10px]">Nov račun</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveView("kitchen")} className="h-8 flex-col gap-0.5 py-1">
            <ChefHat className="h-3.5 w-3.5" />
            <span className="text-[10px]">Kuhinja</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveView("zreport")} className="h-8 flex-col gap-0.5 py-1">
            <Receipt className="h-3.5 w-3.5" />
            <span className="text-[10px]">Z-report</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
