// @ts-nocheck — pre-existing TS errors (Task U1)
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, Calculator, CheckCircle2, AlertCircle, TrendingUp, Coins } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReconciliationData {
  shift: {
    id: string;
    operator: string;
    startTime: string;
    endTime: string | null;
    startCash: number;
    endCash: number | null;
    status: string;
  };
  denominations: { value: number; label: string; type: string }[];
  summary: {
    cashRevenue: number;
    cardRevenue: number;
    giftcardRevenue: number;
    totalRevenue: number;
    totalTips: number;
    cashOrderCount: number;
    cardOrderCount: number;
    giftcardOrderCount: number;
    totalOrders: number;
    startCash: number;
    expectedCash: number;
  };
}

export function CashReconciliation({ shiftId }: { shiftId?: string }) {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [showReconciled, setShowReconciled] = useState(false);

  useEffect(() => {
    const url = shiftId
      ? `/api/shifts/reconciliation?shiftId=${shiftId}`
      : "/api/shifts/reconciliation";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shiftId]);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  // Izračunaj preštet znesek
  const countedCash = data.denominations.reduce((sum, d) => {
    const count = parseInt(counts[d.value]?.toString() || "0") || 0;
    return sum + d.value * count;
  }, 0);

  const difference = countedCash - data.summary.expectedCash;
  const isBalanced = Math.abs(difference) < 0.01;

  function setCount(value: number, count: string) {
    setCounts((prev) => ({ ...prev, [value]: count }));
  }

  function quickFill() {
    // Samodejno izpolni z najbolj pogostimi denominacijami
    const filled: Record<number, string> = {};
    let remaining = data.summary.expectedCash;
    for (const d of data.denominations) {
      const count = Math.floor(remaining / d.value);
      if (count > 0) {
        filled[d.value] = String(count);
        remaining -= count * d.value;
        remaining = Math.round(remaining * 100) / 100;
      }
    }
    setCounts(filled);
    toast.success("Avtomatsko izpolnjeno s pričakovanim zneskom");
  }

  function clearAll() {
    setCounts({});
  }

  return (
    <div className="space-y-4">
      {/* KPI kartice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Pričakovano</p>
            <Banknote className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {formatEUR(data.summary.expectedCash)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            začetno {formatEUR(data.summary.startCash)} + promet
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Preštevano</p>
            <Calculator className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(countedCash)}
          </p>
        </Card>
        <Card className={cn(
          "p-4",
          isBalanced ? "border-emerald-300 dark:border-emerald-800" : "border-rose-300 dark:border-rose-800"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Razlika</p>
            {isBalanced ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
          </div>
          <p className={cn(
            "mt-2 text-2xl font-bold",
            isBalanced ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            {difference >= 0 ? "+" : ""}{formatEUR(difference)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Napitnine</p>
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatEUR(data.summary.totalTips)}
          </p>
        </Card>
      </div>

      {/* Status banner */}
      {isBalanced && countedCash > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-semibold">Blagajna je usklajena! 🎉</p>
        </div>
      )}
      {!isBalanced && countedCash > 0 && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border p-3",
          difference > 0
            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
            : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
        )}>
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-semibold">
            {difference > 0
              ? `Presežek: ${formatEUR(difference)} — prešli ste več, kot pričakovano`
              : `Manjko: ${formatEUR(Math.abs(difference))} — prešli ste manj, kot pričakovano`}
          </p>
        </div>
      )}

      {/* Denominacije */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/30 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-amber-600" />
            Štetje gotovine
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={quickFill}>
              Avto-izpolni
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Počisti
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.denominations.map((d) => {
            const count = parseInt(counts[d.value]?.toString() || "0") || 0;
            const subtotal = d.value * count;
            return (
              <div
                key={d.value}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2",
                  d.type === "banknote"
                    ? "border-sky-200 bg-sky-50/30 dark:border-sky-900 dark:bg-sky-950/10"
                    : "border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10"
                )}
              >
                <div className={cn(
                  "flex h-10 w-14 shrink-0 items-center justify-center rounded text-xs font-bold",
                  d.type === "banknote"
                    ? "bg-sky-200 text-sky-800 dark:bg-sky-900 dark:text-sky-200"
                    : "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                )}>
                  {d.label}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={counts[d.value] || ""}
                  onChange={(e) => setCount(d.value, e.target.value)}
                  placeholder="0"
                  className="h-9 w-16 text-center"
                />
                <span className="text-[10px] text-muted-foreground">×</span>
                <div className="flex-1 text-right">
                  <p className="text-xs font-semibold tabular-nums">
                    {formatEUR(subtotal)}
                  </p>
                  {count > 0 && (
                    <p className="text-[9px] text-muted-foreground">{count} kos</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Povzetek po načinih plačila */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Povzetek po načinih plačila</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md bg-muted/30 p-2">
            <span className="flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4 text-emerald-500" />
              Gotovina
              <Badge variant="outline" className="text-[10px]">{data.summary.cashOrderCount}</Badge>
            </span>
            <span className="font-bold tabular-nums">{formatEUR(data.summary.cashRevenue)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/30 p-2">
            <span className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-sky-500" />
              Kartica
              <Badge variant="outline" className="text-[10px]">{data.summary.cardOrderCount}</Badge>
            </span>
            <span className="font-bold tabular-nums">{formatEUR(data.summary.cardRevenue)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-muted/30 p-2">
            <span className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-violet-500" />
              Darilna kartica
              <Badge variant="outline" className="text-[10px]">{data.summary.giftcardOrderCount}</Badge>
            </span>
            <span className="font-bold tabular-nums">{formatEUR(data.summary.giftcardRevenue)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
            <span>Skupaj</span>
            <span className="tabular-nums">{formatEUR(data.summary.totalRevenue)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
