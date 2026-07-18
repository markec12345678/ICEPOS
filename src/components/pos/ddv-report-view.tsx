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
import { toast } from "sonner";
import {
  FileText,
  Euro,
  Percent,
  Download,
  Calendar,
  TrendingUp,
  Banknote,
  CreditCard,
  Gift,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface VatBucket {
  rate: number;
  ratePercent: string;
  net: number;
  vat: number;
  gross: number;
  count: number;
}

interface DailyEntry {
  date: string;
  gross: number;
  vat: number;
  net: number;
  count: number;
}

interface PaymentMethodEntry {
  method: string;
  count: number;
  gross: number;
  vat: number;
}

interface DdvData {
  period: { from: string; to: string };
  tenant: {
    name: string;
    taxNumber: string;
    businessUnit: string;
    cashRegister: string;
  };
  sales: {
    vatBuckets: VatBucket[];
    totalNet: number;
    totalVat: number;
    totalGross: number;
    totalTips: number;
    orderCount: number;
  };
  storno: {
    vatBuckets: VatBucket[];
    totalGross: number;
    totalVat: number;
    count: number;
  };
  net: {
    totalGross: number;
    totalVat: number;
  };
  byPaymentMethod: PaymentMethodEntry[];
  daily: DailyEntry[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Gotovina",
  card: "Kartica",
  giftcard: "Darilna kartica",
  unknown: "Drugo",
};

function paymentLabel(m: string): string {
  return PAYMENT_LABELS[m] || m;
}

function paymentIcon(m: string) {
  if (m === "cash") return Banknote;
  if (m === "card") return CreditCard;
  if (m === "giftcard") return Gift;
  return Banknote;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

export function DdvReportView() {
  const [data, setData] = useState<DdvData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState("thisMonth");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/ddv-report${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju DDV poročila");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function applyPeriod(p: string) {
    setPeriod(p);
    const now = new Date();
    if (p === "today") {
      const today = now.toISOString().slice(0, 10);
      setFrom(today);
      setTo(today);
    } else if (p === "yesterday") {
      const y = new Date(now.getTime() - 86400000);
      const yStr = y.toISOString().slice(0, 10);
      setFrom(yStr);
      setTo(yStr);
    } else if (p === "thisMonth") {
      setFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
      setTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));
    } else if (p === "lastMonth") {
      setFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10));
      setTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10));
    } else if (p === "thisQuarter") {
      const q = Math.floor(now.getMonth() / 3);
      setFrom(new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10));
      setTo(new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10));
    } else if (p === "thisYear") {
      setFrom(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
      setTo(new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10));
    }
  }

  function exportCsv() {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`DDV poročilo;${data.tenant.name};${data.tenant.taxNumber}`);
    lines.push(`Obdobje;${formatDate(data.period.from)} - ${formatDate(data.period.to)}`);
    lines.push("");
    lines.push("STOPNJA;NETO;DDV;BRUTO;ŠT.POSTAVK");
    for (const b of data.sales.vatBuckets) {
      lines.push(`${b.ratePercent};${b.net.toFixed(2)};${b.vat.toFixed(2)};${b.gross.toFixed(2)};${b.count}`);
    }
    lines.push(`SKUPAJ;${data.sales.totalNet.toFixed(2)};${data.sales.totalVat.toFixed(2)};${data.sales.totalGross.toFixed(2)};${data.sales.orderCount}`);
    lines.push("");
    lines.push("STORNO");
    for (const b of data.storno.vatBuckets) {
      lines.push(`${b.ratePercent};${b.net.toFixed(2)};${b.vat.toFixed(2)};${b.gross.toFixed(2)};${b.count}`);
    }
    lines.push("");
    lines.push("NETO ZA OBDOBJE");
    lines.push(`Bruto;${data.net.totalGross.toFixed(2)}`);
    lines.push(`DDV;${data.net.totalVat.toFixed(2)}`);

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ddv-porocilo-${data.period.from}-${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✓ CSV izvožen");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">DDV poročilo</h2>
          <p className="text-sm text-muted-foreground">Davčno poročilo po stopnjah DDV</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.sales;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <FileText className="h-6 w-6 text-emerald-600" />
            DDV poročilo
          </h2>
          <p className="text-sm text-muted-foreground">
            Davčno poročilo po stopnjah DDV — {data.tenant.name} (davčna št. {data.tenant.taxNumber})
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      {/* Period filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Od datuma
            </label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Do datuma
            </label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Select value={period} onValueChange={applyPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Hitri izbor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Danes</SelectItem>
              <SelectItem value="yesterday">Včeraj</SelectItem>
              <SelectItem value="thisMonth">Trenutni mesec</SelectItem>
              <SelectItem value="lastMonth">Prejšnji mesec</SelectItem>
              <SelectItem value="thisQuarter">Trenutni četrtletje</SelectItem>
              <SelectItem value="thisYear">Trenutno leto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <Calendar className="mr-1 inline h-3 w-3" />
          Obdobje: {formatDate(data.period.from)} – {formatDate(data.period.to)}
        </p>
      </Card>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Neto promet</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalNet)}</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">DDV skupaj</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalVat)}
              </p>
            </div>
            <Percent className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Bruto promet</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalGross)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Št. računov</p>
              <p className="text-2xl font-bold">{s.orderCount}</p>
              {s.totalTips > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {formatEUR(s.totalTips)} napitnin
                </p>
              )}
            </div>
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* DDV po stopnjah */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-4">
          <h3 className="font-semibold">DDV po stopnjah</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-semibold">Stopnja DDV</th>
                <th className="px-4 py-3 text-right font-semibold">Neto osnova</th>
                <th className="px-4 py-3 text-right font-semibold">Znesek DDV</th>
                <th className="px-4 py-3 text-right font-semibold">Bruto znesek</th>
                <th className="px-4 py-3 text-right font-semibold">Št. postavk</th>
              </tr>
            </thead>
            <tbody>
              {s.vatBuckets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Ni podatkov za izbrano obdobje
                  </td>
                </tr>
              ) : (
                s.vatBuckets.map((b) => (
                  <tr key={b.rate} className="border-b">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="font-mono">
                        {b.ratePercent}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{formatEUR(b.net)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-700 dark:text-amber-400">
                      {formatEUR(b.vat)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatEUR(b.gross)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{b.count}</td>
                  </tr>
                ))
              )}
              {s.vatBuckets.length > 0 && (
                <tr className="border-b-2 bg-muted/20 font-semibold">
                  <td className="px-4 py-3">SKUPAJ</td>
                  <td className="px-4 py-3 text-right">{formatEUR(s.totalNet)}</td>
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
                    {formatEUR(s.totalVat)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatEUR(s.totalGross)}</td>
                  <td className="px-4 py-3 text-right">{s.orderCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Storno */}
      {data.storno.count > 0 && (
        <Card className="border-rose-200 p-4 dark:border-rose-900">
          <h3 className="mb-3 font-semibold text-rose-700 dark:text-rose-300">
            Stornirani računi ({data.storno.count})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Bruto storno</p>
              <p className="text-lg font-bold text-rose-600">
                {formatEUR(data.storno.totalGross)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">DDV storno</p>
              <p className="text-lg font-bold text-rose-600">
                {formatEUR(data.storno.totalVat)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Neto za odmero</p>
              <p className="text-lg font-bold">{formatEUR(data.net.totalGross)}</p>
              <p className="text-xs text-muted-foreground">
                (promet − storno)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Po plačilnih metodah */}
      {data.byPaymentMethod.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Po plačilnih metodah</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.byPaymentMethod.map((m) => {
              const Icon = paymentIcon(m.method);
              return (
                <div key={m.method} className="flex items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{paymentLabel(m.method)}</p>
                      <p className="text-xs text-muted-foreground">{m.count} računov</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatEUR(m.gross)}</p>
                    <p className="text-xs text-muted-foreground">DDV: {formatEUR(m.vat)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Dnevni pregled */}
      {data.daily.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Dnevni pregled</h3>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Datum</th>
                  <th className="px-3 py-2 text-right font-semibold">Računov</th>
                  <th className="px-3 py-2 text-right font-semibold">Neto</th>
                  <th className="px-3 py-2 text-right font-semibold">DDV</th>
                  <th className="px-3 py-2 text-right font-semibold">Bruto</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((d) => (
                  <tr key={d.date} className="border-b">
                    <td className="px-3 py-2">{formatDate(d.date)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{d.count}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(d.net)}</td>
                    <td className="px-3 py-2 text-right text-amber-700 dark:text-amber-400">
                      {formatEUR(d.vat)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatEUR(d.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {s.orderCount === 0 && (
        <EmptyState
          icon={FileText}
          title="Ni računov v izbranem obdobju"
          description="Izberi drugo obdobje ali preveri, ali so bili izdani računi"
        />
      )}
    </div>
  );
}
