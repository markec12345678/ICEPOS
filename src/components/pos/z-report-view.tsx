"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, formatDateTime, formatTime } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileBarChart,
  Printer,
  Calendar,
  TrendingUp,
  Receipt,
  RotateCcw,
  Banknote,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ZReport {
  date: string;
  zReportNumber: number;
  generatedAt: string;
  businessUnit: string;
  cashRegister: string;
  operator: string;
  summary: {
    grossTotal: number;
    stornoTotal: number;
    netTotal: number;
    netVatTotal: number;
    receiptCount: number;
    stornoCount: number;
    firstReceiptAt: string | null;
    lastReceiptAt: string | null;
  };
  vatBreakdown: {
    rate: number;
    ratePercent: string;
    base: number;
    vat: number;
    gross: number;
  }[];
  paymentBreakdown: { method: string; count: number; total: number }[];
  receipts: {
    id: string;
    invoiceNumber: string | null;
    type: string;
    time: string | null;
    total: number;
    paymentMethod: string | null;
    zoi: string | null;
    eor: string | null;
  }[];
}

export function ZReportView() {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const { data, loading, error, refetch } = useFetch<ZReport>(
    `/api/z-report?date=${date}`
  );

  if (error) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Napaka pri nalaganju Z-reporta.
      </div>
    );
  }

  const r = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Dnevni zaključek (Z-report)
          </h2>
          <p className="text-xs text-muted-foreground">
            FURS obvezen povzetek vseh računov za izbrani dan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[180px] pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Osveži
          </Button>
          <Button
            onClick={() => {
              window.print();
              toast.info("Pripravljam Z-report za tiskanje...");
            }}
            disabled={!r}
          >
            <Printer className="mr-2 h-4 w-4" />
            Natisni
          </Button>
        </div>
      </div>

      {loading || !r ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : r.summary.receiptCount === 0 ? (
        <Card className="p-12 text-center">
          <FileBarChart className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ni računov za {r.date}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Za izbrani dan ni bilo izdanih računov.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI kartice */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Neto prihodek"
              value={formatEUR(r.summary.netTotal)}
              sub={`bruto ${formatEUR(r.summary.grossTotal)}`}
              icon={TrendingUp}
              accent="emerald"
            />
            <KpiCard
              label="Št. računov"
              value={String(r.summary.receiptCount)}
              sub={
                r.summary.stornoCount > 0
                  ? `${r.summary.stornoCount} stornov`
                  : "brez stornov"
              }
              icon={Receipt}
              accent="amber"
            />
            <KpiCard
              label="Skupni DDV"
              value={formatEUR(r.summary.netVatTotal)}
              sub={`${r.vatBreakdown.length} stopenj`}
              icon={FileBarChart}
              accent="neutral"
            />
            <KpiCard
              label="Storno"
              value={formatEUR(r.summary.stornoTotal)}
              sub={`${r.summary.stornoCount} računov`}
              icon={RotateCcw}
              accent="rose"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* DDV razčlenitev */}
            <Card className="p-5 lg:col-span-2">
              <h3 className="mb-4 font-bold">DDV razčlenitev</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2">Stopnja</th>
                      <th className="pb-2 text-right">Osnova</th>
                      <th className="pb-2 text-right">DDV</th>
                      <th className="pb-2 text-right">Bruto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.vatBreakdown.map((v) => (
                      <tr
                        key={v.rate}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 font-medium">
                          {v.ratePercent}%
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatEUR(v.base)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatEUR(v.vat)}
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formatEUR(v.gross)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border">
                      <td className="pt-2 font-bold">SKUPAJ</td>
                      <td className="pt-2 text-right font-bold">
                        {formatEUR(
                          r.vatBreakdown.reduce((s, v) => s + v.base, 0)
                        )}
                      </td>
                      <td className="pt-2 text-right font-bold">
                        {formatEUR(r.summary.netVatTotal)}
                      </td>
                      <td className="pt-2 text-right font-bold">
                        {formatEUR(r.summary.netTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            {/* Načini plačila */}
            <Card className="p-5">
              <h3 className="mb-4 font-bold">Načini plačila</h3>
              <div className="space-y-3">
                {r.paymentBreakdown.map((p) => {
                  const isCard = p.method === "card";
                  const Icon = isCard ? CreditCard : Banknote;
                  return (
                    <div
                      key={p.method}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            isCard
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {isCard ? "Kartica" : "Gotovina"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.count} računov
                          </p>
                        </div>
                      </div>
                      <span className="font-bold">{formatEUR(p.total)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Seznam računov */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-border p-4">
              <h3 className="font-bold">
                Seznam računov ({r.receipts.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Prvi: {r.summary.firstReceiptAt ? formatTime(r.summary.firstReceiptAt) : "-"}{" "}
                &middot; Zadnji:{" "}
                {r.summary.lastReceiptAt ? formatTime(r.summary.lastReceiptAt) : "-"}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-2">Št. računa</th>
                    <th className="px-4 py-2">Čas</th>
                    <th className="px-4 py-2">Tip</th>
                    <th className="px-4 py-2">Plačilo</th>
                    <th className="px-4 py-2 text-right">Znesek</th>
                  </tr>
                </thead>
                <tbody>
                  {r.receipts.map((rec) => (
                    <tr
                      key={rec.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-2 font-mono text-xs">
                        {rec.invoiceNumber}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {rec.time ? formatTime(rec.time) : "-"}
                      </td>
                      <td className="px-4 py-2">
                        {rec.type === "STORNO" ? (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                          >
                            STORNO
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                          >
                            RAČUN
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {rec.paymentMethod === "card" ? "Kartica" : "Gotovina"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right font-semibold",
                          rec.type === "STORNO" &&
                            "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {formatEUR(rec.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Metadata */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Z-report št.</p>
                <p className="font-mono font-semibold">
                  {r.zReportNumber.toString().padStart(4, "0")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Poslovni prostor</p>
                <p className="font-mono font-semibold">{r.businessUnit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blagajna</p>
                <p className="font-mono font-semibold">{r.cashRegister}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blagajnik</p>
                <p className="font-semibold">{r.operator}</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "neutral" | "rose";
}) {
  const accentClasses = {
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
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
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}
