"use client";

import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, type DashboardStats } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Receipt,
  Wallet,
  Users,
  Banknote,
  CreditCard,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/pos/dashboard-header";

export function DashboardView() {
  const { data, loading, error } = useFetch<DashboardStats>("/api/stats");

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Napaka pri nalaganju statistike.
        </p>
      </div>
    );
  }

  const maxHour = Math.max(...data.hourly.map((h) => h.revenue), 1);

  return (
    <div className="space-y-4">
      {/* Header: aktivna smena + rezervacije + hitre akcije */}
      <DashboardHeader />

      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Prihodek danes"
          value={formatEUR(data.todayRevenue)}
          icon={TrendingUp}
          accent="emerald"
        />
        <KpiCard
          label="Št. računov"
          value={String(data.todayOrders)}
          icon={Receipt}
          accent="amber"
        />
        <KpiCard
          label="Povprečni račun"
          value={formatEUR(data.avgOrderValue)}
          icon={Wallet}
          accent="neutral"
        />
        <KpiCard
          label="Aktivne mize"
          value={`${data.openTables}/${data.totalTables}`}
          icon={Users}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Urna statistika */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3>Prihodek po urah</h3>
              <p className="text-xs text-muted-foreground">
                Današnji dan (8:00 – 23:00)
              </p>
            </div>
            <Badge variant="secondary">{formatEUR(data.todayRevenue)} skupaj</Badge>
          </div>
          <div className="flex h-48 items-end gap-1.5">
            {data.hourly.map((h) => (
              <div
                key={h.hour}
                className="group flex flex-1 flex-col items-center gap-1.5"
              >
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-amber-400 to-orange-500 transition-all hover:from-amber-500 hover:to-orange-600"
                    style={{
                      height: `${Math.max((h.revenue / maxHour) * 100, 2)}%`,
                    }}
                  >
                    {h.revenue > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {formatEUR(h.revenue)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top izdelki */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3>Top izdelki</h3>
          </div>
          {data.topItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Trophy className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Še ni prodaje danes.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Top izdelki se bodo prikazali po prvem plačilu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      i === 0
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count}× &middot; {formatEUR(item.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Delitev plačil */}
      <Card className="p-5">
        <h3 className="mb-4">Načini plačila</h3>
        {data.paymentSplit.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Wallet className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Ni zaključenih računov.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.paymentSplit.map((p) => {
              const isCard = p.method === "card";
              const Icon = isCard ? CreditCard : Banknote;
              return (
                <div
                  key={p.method}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      isCard
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isCard ? "Kartica" : "Gotovina"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.count} računov
                    </p>
                    <p className="text-sm font-bold">{formatEUR(p.total)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "neutral" | "rose";
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    neutral: "bg-muted text-foreground",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentClasses[accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </Card>
  );
}
