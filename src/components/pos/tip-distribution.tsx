"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Clock, Receipt, Users, Copy, Check } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TipData {
  date: string;
  summary: {
    totalTips: number;
    tipCount: number;
    avgTip: number;
    tipRate: number;
    operatorCount: number;
  };
  byOrders: { operator: string; tipCount: number; totalTips: number }[];
  byHours: { operator: string; role: string; hours: number; share: number; tips: number }[];
  byRole: { role: string; operators: string[]; tips: number }[];
}

type Method = "byOrders" | "byHours" | "byRole";

const METHOD_LABELS: Record<Method, string> = {
  byOrders: "Po računih (vsak dobi svoje)",
  byHours: "Po urah (enak delež)",
  byRole: "Po vlogi (natakar 60%, kuhar 25%, blagajnik 15%)",
};

export function TipDistribution() {
  const [data, setData] = useState<TipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<Method>("byHours");
  const [copied, setCopied] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    fetch(`/api/tips/distribution?date=${date}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date]);

  async function copyDistribution() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Porazdelitev napitnin — ${data.date}`);
    lines.push(`Skupne napitnine: ${formatEUR(data.summary.totalTips)}`);
    lines.push(`Način: ${METHOD_LABELS[method]}`);
    lines.push("");

    if (method === "byOrders") {
      lines.push("Po računih:");
      data.byOrders.forEach((o) => {
        lines.push(`  ${o.operator}: ${formatEUR(o.totalTips)} (${o.tipCount} računov)`);
      });
    } else if (method === "byHours") {
      lines.push("Po urah dela:");
      data.byHours.forEach((o) => {
        lines.push(`  ${o.operator} (${o.role}): ${formatEUR(o.tips)} — ${o.hours}h (${o.share}%)`);
      });
    } else {
      lines.push("Po vlogah:");
      data.byRole.forEach((r) => {
        lines.push(`  ${r.role}: ${formatEUR(r.tips)}/osebo (${r.operators.length} oseb)`);
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      toast.success("Porazdelitev kopirana");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiranje ni uspelo");
    }
  }

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

  if (data.summary.totalTips === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        <Coins className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Ni napitnin za {data.date}.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Datum + kopiraj */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button variant="outline" size="sm" onClick={copyDistribution}>
          {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
          Kopiraj
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupne napitnine</p>
            <Coins className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(data.summary.totalTips)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Računov z napitnino</p>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.summary.tipCount}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. napitnina</p>
            <Coins className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {formatEUR(data.summary.avgTip)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tip rate</p>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.summary.tipRate}%
          </p>
        </Card>
      </div>

      {/* Method selector */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={method === "byOrders" ? "default" : "outline"}
          size="sm"
          onClick={() => setMethod("byOrders")}
        >
          <Receipt className="mr-1.5 h-3.5 w-3.5" />
          Po računih
        </Button>
        <Button
          variant={method === "byHours" ? "default" : "outline"}
          size="sm"
          onClick={() => setMethod("byHours")}
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Po urah
        </Button>
        <Button
          variant={method === "byRole" ? "default" : "outline"}
          size="sm"
          onClick={() => setMethod("byRole")}
        >
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Po vlogi
        </Button>
      </div>

      {/* Distribution */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{METHOD_LABELS[method]}</p>
        </div>

        {method === "byOrders" && (
          <div className="divide-y">
            {data.byOrders.map((o, i) => (
              <div key={o.operator} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{o.operator}</p>
                    <p className="text-[10px] text-muted-foreground">{o.tipCount} računov z napitnino</p>
                  </div>
                </div>
                <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatEUR(o.totalTips)}
                </p>
              </div>
            ))}
          </div>
        )}

        {method === "byHours" && (
          <div className="divide-y">
            {data.byHours.map((o, i) => (
              <div key={o.operator} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{o.operator}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {o.hours}h · {o.role} · {o.share}% delež
                    </p>
                  </div>
                </div>
                <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatEUR(o.tips)}
                </p>
              </div>
            ))}
          </div>
        )}

        {method === "byRole" && (
          <div className="divide-y">
            {data.byRole.map((r) => (
              <div key={r.role} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{r.role}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.operators.join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-violet-600 dark:text-violet-400">
                      {formatEUR(r.tips)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">na osebo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
