"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  TrendingUp,
  Percent,
  Receipt,
  Banknote,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaxReportData {
  period: {
    month: number;
    year: number;
    monthLabel: string;
  };
  summary: {
    totalRevenue: number;
    totalVat: number;
    totalBase: number;
    stornoTotal: number;
    netRevenue: number;
    orderCount: number;
    stornoCount: number;
    firstInvoice: string;
    lastInvoice: string;
  };
  vatRates: {
    rate: number;
    ratePercent: number;
    base: number;
    vat: number;
    total: number;
    count: number;
  }[];
  paymentMethodStats: {
    method: string;
    count: number;
    total: number;
    vat: number;
  }[];
  dailyStats: {
    date: string;
    revenue: number;
    vat: number;
    orders: number;
  }[];
  fursData: {
    taxNumber: string;
    businessUnit: string;
    cashRegister: string;
    restaurantName: string;
  };
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("sl-SI", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export function TaxReportView() {
  const [data, setData] = useState<TaxReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tax-report?month=${month}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju DDV poročila");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCSV() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`DDV poročilo — ${data.period.monthLabel}`);
    lines.push(`Restavracija: ${data.fursData.restaurantName}`);
    lines.push(`Davčna št.: ${data.fursData.taxNumber}`);
    lines.push(`Poslovni prostor: ${data.fursData.businessUnit}`);
    lines.push("");
    lines.push("Skupne metrike");
    lines.push(`Skupni promet;${data.summary.totalRevenue}`);
    lines.push(`DDV skupaj;${data.summary.totalVat}`);
    lines.push(`Osnova (brez DDV);${data.summary.totalBase}`);
    lines.push(`Storno;${data.summary.stornoTotal}`);
    lines.push(`Neto promet;${data.summary.netRevenue}`);
    lines.push(`Št. računov;${data.summary.orderCount}`);
    lines.push("");
    lines.push("DDV po stopnjah");
    lines.push("Stopnja;Osnova;DDV;Skupaj;Postavk");
    for (const v of data.vatRates) {
      lines.push(`${v.ratePercent}%;${v.base};${v.vat};${v.total};${v.count}`);
    }
    lines.push("");
    lines.push("Po načinih plačila");
    lines.push("Način;Št. računov;Znesek;DDV");
    for (const p of data.paymentMethodStats) {
      lines.push(`${p.method};${p.count};${p.total};${p.vat}`);
    }
    lines.push("");
    lines.push("Dnevna razčlenitev");
    lines.push("Datum;Promet;DDV;Računov");
    for (const d of data.dailyStats) {
      lines.push(`${d.date};${d.revenue};${d.vat};${d.orders}`);
    }

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DDV-porocilo-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("DDV poročilo izvoženo kot CSV");
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <FileText className="h-5 w-5 text-amber-600" />
            DDV poročilo
          </h2>
          <p className="text-xs text-muted-foreground">
            Mesečno poročilo za računovodstvo — {data.fursData.restaurantName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline">
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* FURS info */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Davčna št.: <strong className="text-foreground">{data.fursData.taxNumber}</strong></span>
          <span>Poslovni prostor: <strong className="text-foreground">{data.fursData.businessUnit}</strong></span>
          <span>Blagajna: <strong className="text-foreground">{data.fursData.cashRegister}</strong></span>
          <span>Obdobje: <strong className="text-foreground">{data.period.monthLabel}</strong></span>
        </div>
      </Card>

      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupni promet</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(summary.totalRevenue)}
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
            <p className="text-xs text-muted-foreground">Neto (brez DDV)</p>
            <Receipt className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatEUR(summary.totalBase)}
          </p>
        </Card>
        <Card className={cn("p-4", summary.stornoCount > 0 && "border-rose-300 dark:border-rose-800")}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Storno</p>
            <AlertCircle className={cn("h-4 w-4", summary.stornoCount > 0 ? "text-rose-500" : "text-muted-foreground")} />
          </div>
          <p className={cn("mt-2 text-2xl font-bold", summary.stornoCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
            {formatEUR(summary.stornoTotal)}
          </p>
          <p className="text-[10px] text-muted-foreground">{summary.stornoCount} računov</p>
        </Card>
      </div>

      {/* DDV po stopnjah */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <h3 className="text-sm font-semibold">DDV razčlenitev po stopnjah</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="p-2 text-left font-medium">Stopnja</th>
                <th className="p-2 text-right font-medium">Osnova (brez DDV)</th>
                <th className="p-2 text-right font-medium">DDV</th>
                <th className="p-2 text-right font-medium">Skupaj z DDV</th>
                <th className="p-2 text-right font-medium">Postavk</th>
              </tr>
            </thead>
            <tbody>
              {data.vatRates.map((v) => (
                <tr key={v.rate} className="border-t border-border/40">
                  <td className="p-2">
                    <Badge variant="outline" className="font-mono">
                      {v.ratePercent.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="p-2 text-right tabular-nums">{formatEUR(v.base)}</td>
                  <td className="p-2 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                    {formatEUR(v.vat)}
                  </td>
                  <td className="p-2 text-right tabular-nums font-semibold">{formatEUR(v.total)}</td>
                  <td className="p-2 text-right tabular-nums text-muted-foreground">{v.count}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-bold">
                <td className="p-2">SKUPAJ</td>
                <td className="p-2 text-right tabular-nums">{formatEUR(summary.totalBase)}</td>
                <td className="p-2 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatEUR(summary.totalVat)}</td>
                <td className="p-2 text-right tabular-nums">{formatEUR(summary.totalRevenue)}</td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Po načinih plačila */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="text-sm font-semibold">Po načinih plačila</h3>
          </div>
          <div className="p-3 space-y-2">
            {data.paymentMethodStats.map((p) => {
              const icon = p.method === "cash" ? Banknote : p.method === "card" ? CreditCard : Receipt;
              const Icon = icon;
              const label = p.method === "cash" ? "Gotovina" : p.method === "card" ? "Kartica" : p.method === "giftcard" ? "Darilna kartica" : p.method;
              return (
                <div key={p.method} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                    <Badge variant="outline" className="text-[10px]">{p.count}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatEUR(p.total)}</p>
                    <p className="text-[10px] text-muted-foreground">DDV: {formatEUR(p.vat)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Dnevni graf */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 p-3">
            <h3 className="text-sm font-semibold">Dnevni promet</h3>
          </div>
          <div className="p-3">
            {data.dailyStats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Ni podatkov za to obdobje</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {data.dailyStats.map((d) => {
                  const maxRev = Math.max(...data.dailyStats.map((x) => x.revenue), 1);
                  return (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-[10px] text-muted-foreground">
                        {new Date(d.date).toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <div className="relative h-4 flex-1 overflow-hidden rounded bg-muted/50">
                        <div
                          className="h-full rounded bg-gradient-to-r from-amber-400 to-orange-500"
                          style={{ width: `${(d.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-[10px] font-medium tabular-nums">
                        {formatEUR(d.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">📋 Računovodske informacije</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Prvi račun:</strong> {summary.firstInvoice}</p>
          <p>• <strong>Zadnji račun:</strong> {summary.lastInvoice}</p>
          <p>• <strong>Skupno računov:</strong> {summary.orderCount} (+ {summary.stornoCount} storniranih)</p>
          <p>• <strong>Neto promet:</strong> {formatEUR(summary.netRevenue)} (po odbitku storniranj)</p>
          <p className="mt-2 text-[10px]">⚠️ To poročilo je informativne narave. Za uradno DDV poročilo uporabite eDavki.</p>
        </div>
      </Card>
    </div>
  );
}
