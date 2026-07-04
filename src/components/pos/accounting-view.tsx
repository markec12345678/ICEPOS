"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calculator,
  TrendingUp,
  Receipt,
  Percent,
  AlertCircle,
  Building,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { TaxReportView } from "@/components/pos/tax-report-view";
import { LoadingSpinner, ErrorState, KpiSkeleton, TableSkeleton, ListSkeleton } from "@/components/pos/loading-states";

interface AccountingSummary {
  from: string;
  to: string;
  orderCount: number;
  totalRevenue: number;
  totalVat: number;
  totalNet: number;
  totalTips: number;
  stornoCount: number;
  stornoAmount: number;
  vatBreakdown: { rate: number; base: number; vat: number; gross: number; count: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Gotovina",
  card: "Kartica",
  giftcard: "Darilna kartica",
};

export function AccountingView() {
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/summary?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Napaka");
      setSummary(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju povzetka");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function downloadExport(format: "csv" | "pantheon" | "quickbooks" | "xml") {
    const url = `/api/accounting/export?from=${from}&to=${to}&format=${format}`;
    window.open(url, "_blank");
    toast.success(`Izvoz ${format.toUpperCase()} pripravljen`);
  }

  if (loading || !summary) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Calculator className="h-6 w-6 text-blue-600" />
            Računovodstvo
          </h2>
          <p className="text-sm text-muted-foreground">
            Povzetek in izvoz za računovodski program
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj promet</p>
              <p className="text-xl font-bold">{formatEUR(summary.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">{summary.orderCount} računov</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">DDV</p>
              <p className="text-xl font-bold text-amber-600">{formatEUR(summary.totalVat)}</p>
              <p className="text-xs text-muted-foreground">neto: {formatEUR(summary.totalNet)}</p>
            </div>
            <Percent className="h-5 w-5 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Napitnine</p>
              <p className="text-xl font-bold">{formatEUR(summary.totalTips)}</p>
            </div>
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Storno računi</p>
              <p className={`text-xl font-bold ${summary.stornoCount > 0 ? "text-rose-600" : ""}`}>
                {summary.stornoCount}
              </p>
              {summary.stornoCount > 0 && (
                <p className="text-xs text-rose-600">{formatEUR(summary.stornoAmount)}</p>
              )}
            </div>
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DDV breakdown */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-3">
            <h3 className="text-sm font-semibold">DDV po stopnjah</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Stopnja</th>
                <th className="p-3 text-right font-medium">Osnova</th>
                <th className="p-3 text-right font-medium">DDV</th>
                <th className="p-3 text-right font-medium">Bruto</th>
              </tr>
            </thead>
            <tbody>
              {summary.vatBreakdown.map((v) => (
                <tr key={v.rate} className="border-b last:border-0">
                  <td className="p-3">
                    <Badge variant="outline">
                      {(v.rate * 100).toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-mono">{formatEUR(v.base)}</td>
                  <td className="p-3 text-right font-mono text-amber-600">{formatEUR(v.vat)}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatEUR(v.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Payment methods */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-3">
            <h3 className="text-sm font-semibold">Načini plačila</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Način</th>
                <th className="p-3 text-right font-medium">Št. računov</th>
                <th className="p-3 text-right font-medium">Znesek</th>
                <th className="p-3 text-right font-medium">Delež</th>
              </tr>
            </thead>
            <tbody>
              {summary.paymentMethods.map((p) => {
                const share = summary.totalRevenue > 0 ? (p.total / summary.totalRevenue) * 100 : 0;
                return (
                  <tr key={p.method} className="border-b last:border-0">
                    <td className="p-3 font-medium">{PAYMENT_LABELS[p.method] || p.method}</td>
                    <td className="p-3 text-right font-mono">{p.count}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatEUR(p.total)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="outline">{share.toFixed(1)}%</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Export buttons */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4" />
          Izvozi za računovodski program
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => downloadExport("csv")}
          >
            <FileText className="h-6 w-6" />
            <span className="text-sm">CSV (Excel)</span>
            <span className="text-xs text-muted-foreground">splošni format</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => downloadExport("pantheon")}
          >
            <Building className="h-6 w-6" />
            <span className="text-sm">Pantheon</span>
            <span className="text-xs text-muted-foreground">slovensko</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => downloadExport("quickbooks")}
          >
            <Calculator className="h-6 w-6" />
            <span className="text-sm">QuickBooks</span>
            <span className="text-xs text-muted-foreground">mednarodno</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => downloadExport("xml")}
          >
            <FileText className="h-6 w-6" />
            <span className="text-sm">XML (eDavki)</span>
            <span className="text-xs text-muted-foreground">slovensko</span>
          </Button>
        </div>
      </Card>

      {/* DDV poročilo */}
      <div>
        <h3 className="mb-3 text-lg font-bold">📊 DDV poročilo</h3>
        <TaxReportView />
      </div>

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako uporabiti izvoze?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>CSV (Excel)</strong>: splošni format, odpre v Excel/Google Sheets. Z BOM za pravilen UTF-8.</p>
          <p>• <strong>Pantheon</strong>: slovenski računovodski program, separator ; (podpičje), decimalke z vejico.</p>
          <p>• <strong>QuickBooks</strong>: mednarodni format, separator , (vejica).</p>
          <p>• <strong>XML (eDavki)</strong>: za uvoz v slovenski eDavki portal.</p>
          <p>• Izvoz vsebuje: številko računa, datum, stranko, bruto/neto/DDV, ZOI, EOR, način plačila, status.</p>
          <p>• Storno računi so označeni in imajo negativen znesek.</p>
        </div>
      </Card>
    </div>
  );
}
