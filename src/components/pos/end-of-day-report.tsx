"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Receipt,
  Percent,
  Coins,
  Users,
  Clock,
  Banknote,
  CreditCard,
  Gift,
  Package,
  AlertTriangle,
  Trophy,
  Printer,
  Download,
  Calendar,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EodData {
  date: string;
  summary: {
    totalRevenue: number;
    netRevenue: number;
    stornoTotal: number;
    totalTips: number;
    orderCount: number;
    stornoCount: number;
    avgOrderValue: number;
    totalVat: number;
    laborCost: number;
    laborHours: number;
    laborCostPct: number;
    stockValue: number;
    lowStockCount: number;
  };
  vatRates: { rate: number; ratePercent: number; base: number; vat: number; total: number }[];
  paymentMethods: { method: string; count: number; total: number; tips: number }[];
  topItems: { name: string; category: string; quantity: number; revenue: number }[];
  hourly: { hour: number; revenue: number; orders: number }[];
  shift: { operator: string; startTime: string; startCash: number; duration: number } | null;
  lowStockItems: { id: string; name: string; unit: string; minQuantity: number }[];
  restaurant: { name: string; taxNumber: string; businessUnit: string; cashRegister: string };
}

function getPaymentIcon(method: string) {
  switch (method) {
    case "cash": return Banknote;
    case "card": return CreditCard;
    case "giftcard": return Gift;
    default: return Receipt;
  }
}

function getPaymentLabel(method: string) {
  switch (method) {
    case "cash": return "Gotovina";
    case "card": return "Kartica";
    case "giftcard": return "Darilna kartica";
    default: return method;
  }
}

export function EndOfDayReport() {
  const [data, setData] = useState<EodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/end-of-day?date=${date}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju poročila");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  function printReport() {
    window.print();
  }

  function exportReport() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`DNEVNI ZAKLJUČNI REPORT — ${data.date}`);
    lines.push(`Restavracija: ${data.restaurant.name}`);
    lines.push(`Davčna št.: ${data.restaurant.taxNumber}`);
    lines.push(`Poslovni prostor: ${data.restaurant.businessUnit} · Blagajna: ${data.restaurant.cashRegister}`);
    lines.push("");
    lines.push("=== SKUPNE METRIKE ===");
    lines.push(`Skupni promet: ${formatEUR(data.summary.totalRevenue)}`);
    lines.push(`Storno: ${formatEUR(data.summary.stornoTotal)} (${data.summary.stornoCount})`);
    lines.push(`Neto promet: ${formatEUR(data.summary.netRevenue)}`);
    lines.push(`DDV skupaj: ${formatEUR(data.summary.totalVat)}`);
    lines.push(`Napitnine: ${formatEUR(data.summary.totalTips)}`);
    lines.push(`Št. računov: ${data.summary.orderCount}`);
    lines.push(`Povprečni račun: ${formatEUR(data.summary.avgOrderValue)}`);
    lines.push(`Strošek dela: ${formatEUR(data.summary.laborCost)} (${data.summary.laborHours}h, ${data.summary.laborCostPct}%)`);
    lines.push(`Vrednost zalog: ${formatEUR(data.summary.stockValue)}`);
    lines.push("");
    lines.push("=== DDV PO STOPNJAH ===");
    for (const v of data.vatRates) {
      lines.push(`${v.ratePercent.toFixed(1)}%: osnova ${formatEUR(v.base)}, DDV ${formatEUR(v.vat)}, skupaj ${formatEUR(v.total)}`);
    }
    lines.push("");
    lines.push("=== NAČINI PLAČILA ===");
    for (const p of data.paymentMethods) {
      lines.push(`${getPaymentLabel(p.method)}: ${p.count} računov, ${formatEUR(p.total)}, napitnine ${formatEUR(p.tips)}`);
    }
    lines.push("");
    lines.push("=== TOP 10 JEDI ===");
    data.topItems.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}: ${item.quantity}× (${formatEUR(item.revenue)})`);
    });

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eod-report-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report izvožen");
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const { summary } = data;
  const maxHourlyRev = Math.max(...data.hourly.map((h) => h.revenue), 1);

  return (
    <div className="space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Calendar className="h-5 w-5 text-amber-600" />
            Dnevni zaključni report
          </h2>
          <p className="text-xs text-muted-foreground">
            {data.restaurant.name} · {new Date(date).toLocaleDateString("sl-SI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="mr-1.5 h-4 w-4" />
            Izvozi
          </Button>
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="mr-1.5 h-4 w-4" />
            Natisni
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-lg font-bold">Dnevni zaključni report — {data.date}</h1>
        <p className="text-xs">{data.restaurant.name} · {data.restaurant.taxNumber} · {data.restaurant.businessUnit}/{data.restaurant.cashRegister}</p>
      </div>

      {/* KPI mreža */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Neto promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(summary.netRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            bruto {formatEUR(summary.totalRevenue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">DDV skupaj</p>
            <Percent className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(summary.totalVat)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Napitnine</p>
            <Coins className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(summary.totalTips)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Računov</p>
            <Receipt className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {summary.orderCount}
          </p>
          <p className="text-[10px] text-muted-foreground">
            povp. {formatEUR(summary.avgOrderValue)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Strošek dela</p>
            <Users className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatEUR(summary.laborCost)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summary.laborHours}h · {summary.laborCostPct}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Vrednost zalog</p>
            <Package className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatEUR(summary.stockValue)}
          </p>
        </Card>
        <Card className={cn("p-4", summary.stornoCount > 0 && "border-rose-300 dark:border-rose-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Storno</p>
            <AlertTriangle className={cn("h-4 w-4", summary.stornoCount > 0 ? "text-rose-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", summary.stornoCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            {summary.stornoCount}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatEUR(summary.stornoTotal)}
          </p>
        </Card>
        <Card className={cn("p-4", summary.lowStockCount > 0 && "border-amber-300 dark:border-amber-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Nizka zaloga</p>
            <AlertTriangle className={cn("h-4 w-4", summary.lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", summary.lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {summary.lowStockCount}
          </p>
        </Card>
      </div>

      {/* Smena info */}
      {data.shift && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Aktivna smena</p>
              <p className="font-semibold">{data.shift.operator}</p>
              <p className="text-xs text-muted-foreground">
                Od {new Date(data.shift.startTime).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
                · {Math.floor(data.shift.duration / 60)}h {data.shift.duration % 60}m
                · začetni status {formatEUR(data.shift.startCash)}
              </p>
            </div>
            <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              V teku
            </Badge>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* DDV + plačila */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">DDV razčlenitev</h3>
            <div className="space-y-2">
              {data.vatRates.map((v) => (
                <div key={v.rate} className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className="font-mono">{v.ratePercent.toFixed(1)}%</Badge>
                  <div className="flex-1 px-3 text-xs text-muted-foreground">
                    Osnova: {formatEUR(v.base)}
                  </div>
                  <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatEUR(v.vat)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Načini plačila</h3>
            <div className="space-y-2">
              {data.paymentMethods.map((p) => {
                const Icon = getPaymentIcon(p.method);
                return (
                  <div key={p.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{getPaymentLabel(p.method)}</span>
                      <Badge variant="outline" className="text-[10px]">{p.count}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">{formatEUR(p.total)}</p>
                      {p.tips > 0 && <p className="text-[10px] text-violet-600 dark:text-violet-400">+{formatEUR(p.tips)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Top jedi + urni graf */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top 10 jedi
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {data.topItems.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Ni prodaje danes</p>
              ) : (
                data.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                        {i + 1}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-semibold tabular-nums">{item.quantity}×</span>
                      <span className="ml-2 text-xs text-muted-foreground">{formatEUR(item.revenue)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-sky-500" />
              Promet po urah
            </h3>
            {data.hourly.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Ni podatkov</p>
            ) : (
              <div className="flex h-24 items-end gap-1">
                {data.hourly.map((h) => (
                  <div key={h.hour} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="relative flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-amber-400 to-orange-500 transition-all hover:from-amber-500 hover:to-orange-600"
                        style={{ height: `${Math.max((h.revenue / maxHourlyRev) * 100, 4)}%` }}
                        title={`${h.hour}:00 — ${formatEUR(h.revenue)} (${h.orders} računov)`}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Low stock alert */}
      {data.lowStockItems.length > 0 && (
        <Card className="border-amber-300 p-4 dark:border-amber-800">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            Artikli brez zaloge ({data.lowStockItems.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.lowStockItems.slice(0, 15).map((item) => (
              <Badge key={item.id} variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400 text-xs">
                {item.name}
              </Badge>
            ))}
            {data.lowStockItems.length > 15 && (
              <span className="text-xs text-muted-foreground">+ {data.lowStockItems.length - 15} več</span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
