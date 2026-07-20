"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Gift,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Euro,
  Percent,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface ByDenomination {
  denomination: number;
  count: number;
  totalValue: number;
  redeemed: number;
}

interface MonthlyEntry {
  month: string;
  count: number;
  value: number;
}

interface ExpiringCard {
  id: string;
  code: string;
  balance: number;
  expiresAt: string;
  customerName: string | null;
}

interface MostRedeemedCard {
  id: string;
  code: string;
  initialAmount: number;
  balance: number;
  redeemed: number;
  redemptionPercent: number;
  customerName: string | null;
  status: string;
  createdAt: string;
}

interface AnalyticsData {
  period: { from: string; to: string };
  summary: {
    totalIssued: number;
    issuedInPeriod: number;
    issuedInPeriodValue: number;
    totalInitialValue: number;
    totalRemainingBalance: number;
    totalRedeemed: number;
    redemptionRate: number;
    avgCardValue: number;
    byStatus: {
      active: number;
      redeemed: number;
      expired: number;
      blocked: number;
    };
  };
  byDenomination: ByDenomination[];
  monthly: MonthlyEntry[];
  expiringSoon: ExpiringCard[];
  expiredWithBalance: ExpiringCard[];
  mostRedeemed: MostRedeemedCard[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function GiftCardAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/gift-card-analytics${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju analitike kartic");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Analitika darilnih kartic</h2>
          <p className="text-sm text-muted-foreground">Statistika izdaje in izrabe</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Gift className="h-6 w-6 text-purple-600" />
          Analitika darilnih kartic
        </h2>
        <p className="text-sm text-muted-foreground">
          Statistika izdaje, izrabe in poteka darilnih kartic
        </p>
      </div>

      {/* Period filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Od datuma</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Do datuma</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
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
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj izdanih</p>
              <p className="text-2xl font-bold">{s.totalIssued}</p>
              <p className="text-xs text-muted-foreground">
                pov. {formatEUR(s.avgCardValue)} / kartico
              </p>
            </div>
            <Gift className="h-8 w-8 text-purple-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupna nominalna</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalInitialValue)}</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Izrabljeno</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatEUR(s.totalRedeemed)}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {s.redemptionRate.toFixed(1)}% izrabe
              </p>
            </div>
            <Percent className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Preostalo</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalRemainingBalance)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
      </div>

      {/* Po statusu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Aktivne</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.byStatus.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Unovčene</p>
              <p className="text-2xl font-bold">{s.byStatus.redeemed}</p>
            </div>
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">Potekle</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{s.byStatus.expired}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Blokirane</p>
              <p className="text-2xl font-bold">{s.byStatus.blocked}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Kmalu potečejo */}
      {data.expiringSoon.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            Kmalu potečejo ({data.expiringSoon.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.expiringSoon.map((card) => {
              const days = daysUntil(card.expiresAt);
              return (
                <div key={card.id} className="rounded border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{card.code}</span>
                    <Badge variant="outline" className="text-amber-600">
                      {days} dni
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.customerName || "Brez stranke"}
                  </p>
                  <p className="mt-1 font-bold text-amber-700 dark:text-amber-400">
                    {formatEUR(card.balance)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Poteče: {formatDate(card.expiresAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Potekle z bilanco */}
      {data.expiredWithBalance.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-200">
            <XCircle className="h-5 w-5" />
            Potekle z neizrabljeno bilanco ({data.expiredWithBalance.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.expiredWithBalance.map((card) => (
              <div key={card.id} className="rounded border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold">{card.code}</span>
                  <span className="font-bold text-rose-600">{formatEUR(card.balance)}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Poteklo: {formatDate(card.expiresAt)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Po nominalnih vrednostih */}
      {data.byDenomination.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Po nominalnih vrednostih</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Nominalna vrednost</th>
                  <th className="px-3 py-2 text-right font-semibold">Št. kartic</th>
                  <th className="px-3 py-2 text-right font-semibold">Skupna vrednost</th>
                  <th className="px-3 py-2 text-right font-semibold">Izrabljeno</th>
                  <th className="px-3 py-2 text-right font-semibold">Izraba %</th>
                </tr>
              </thead>
              <tbody>
                {data.byDenomination.map((d) => (
                  <tr key={d.denomination} className="border-b">
                    <td className="px-3 py-2 font-bold">{formatEUR(d.denomination)}</td>
                    <td className="px-3 py-2 text-right">{d.count}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(d.totalValue)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatEUR(d.redeemed)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-medium">
                        {d.totalValue > 0 ? ((d.redeemed / d.totalValue) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Najbolj izrabljene */}
      {data.mostRedeemed.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Najbolj izrabljene kartice</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Koda</th>
                  <th className="px-3 py-2 text-left font-semibold">Stranka</th>
                  <th className="px-3 py-2 text-right font-semibold">Nominalno</th>
                  <th className="px-3 py-2 text-right font-semibold">Izrabljeno</th>
                  <th className="px-3 py-2 text-right font-semibold">Preostalo</th>
                  <th className="px-3 py-2 text-right font-semibold">Izraba %</th>
                  <th className="px-3 py-2 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.mostRedeemed.map((card) => (
                  <tr key={card.id} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs font-bold">{card.code}</td>
                    <td className="px-3 py-2 text-xs">{card.customerName || "—"}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(card.initialAmount)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {formatEUR(card.redeemed)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-600">
                      {formatEUR(card.balance)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${card.redemptionPercent}%` }}
                          />
                        </div>
                        <span className="text-xs">{card.redemptionPercent.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className="text-xs">
                        {card.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mesečni pregled */}
      {data.monthly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Mesečna izdaja</h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Mesec</th>
                  <th className="px-3 py-2 text-right font-semibold">Št. kartic</th>
                  <th className="px-3 py-2 text-right font-semibold">Vrednost</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.slice(-12).map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-3 py-2 text-right">{m.count}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatEUR(m.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {s.totalIssued === 0 && (
        <EmptyState
          icon={Gift}
          title="Ni darilnih kartic"
          description="Izdaj darilne kartice v modulu Darilne kartice"
        />
      )}
    </div>
  );
}
