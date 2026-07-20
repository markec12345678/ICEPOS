"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Repeat,
  Crown,
  TrendingUp,
  Euro,
  AlertTriangle,
  Calendar,
  Award,
  UserCheck,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Segment {
  segment: string;
  count: number;
  color?: string;
}

interface MonthlyEntry {
  month: string;
  newCustomers: number;
}

interface TopCustomer {
  id: string;
  name: string;
  visitCount: number;
  totalSpent: number;
  points: number;
  avgBasketSize: number;
}

interface ChurnRisk {
  id: string;
  name: string;
  visitCount: number;
  totalSpent: number;
  lastActivity: string;
  daysSinceLastActivity: number;
}

interface RetentionData {
  summary: {
    total: number;
    repeatCustomers: number;
    oneTimeCustomers: number;
    repeatRate: number;
    avgVisits: number;
    avgSpent: number;
    vipCustomers: number;
    inactiveCustomers: number;
    totalCustomerValue: number;
    avgLifetimeValue: number;
  };
  segments: Segment[];
  spendingSegments: Segment[];
  monthly: MonthlyEntry[];
  topByVisits: TopCustomer[];
  topBySpent: TopCustomer[];
  churnRisk: ChurnRisk[];
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });
}

export function CustomerRetentionView() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-retention", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju analitike vračanja");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Vračanje gostov</h2>
          <p className="text-sm text-muted-foreground">Analitika zvestobe in retencije</p>
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
          <Repeat className="h-6 w-6 text-emerald-600" />
          Vračanje gostov
        </h2>
        <p className="text-sm text-muted-foreground">
          Analitika retencije, segmentacija in churn risk analiza
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj strank</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Stopnja vračanja
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.repeatRate.toFixed(1)}%
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {s.repeatCustomers} rednih / {s.oneTimeCustomers} novih
              </p>
            </div>
            <Repeat className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. obiski</p>
              <p className="text-2xl font-bold">{s.avgVisits.toFixed(1)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">LTV (pov.)</p>
              <p className="text-2xl font-bold">{formatEUR(s.avgLifetimeValue)}</p>
              <p className="text-xs text-muted-foreground">
                skupno {formatEUR(s.totalCustomerValue)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
      </div>

      {/* VIP + neaktivne */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-xs font-medium uppercase text-purple-700 dark:text-purple-300">
                VIP stranke
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {s.vipCustomers}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                10+ obiskov ali 500€+ porabe
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Neaktivne (90+ dni)
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {s.inactiveCustomers}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                tveganje izgube
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Segmentacija po obiskih */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Segmentacija po številu obiskov</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.segments.map((seg) => {
            const pct = s.total > 0 ? (seg.count / s.total) * 100 : 0;
            const colors: Record<string, string> = {
              amber: "bg-amber-500",
              blue: "bg-blue-500",
              emerald: "bg-emerald-500",
              purple: "bg-purple-500",
            };
            const barColor = colors[seg.color || ""] || "bg-muted-foreground";
            return (
              <div key={seg.segment} className="rounded border p-3">
                <p className="text-xs text-muted-foreground">{seg.segment}</p>
                <p className="text-2xl font-bold">{seg.count}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Segmentacija po porabi */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Segmentacija po porabi</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.spendingSegments.map((seg) => {
            const pct = s.total > 0 ? (seg.count / s.total) * 100 : 0;
            return (
              <div key={seg.segment} className="rounded border p-3 text-center">
                <p className="text-xs text-muted-foreground">{seg.segment}</p>
                <p className="text-xl font-bold">{seg.count}</p>
                <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Churn risk */}
      {data.churnRisk.length > 0 && (
        <Card className="border-rose-200 p-4 dark:border-rose-900">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
            Tveganje izgube (churn risk) — {data.churnRisk.length}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Stranka</th>
                  <th className="px-3 py-2 text-right font-semibold">Obiskov</th>
                  <th className="px-3 py-2 text-right font-semibold">Poraba</th>
                  <th className="px-3 py-2 text-right font-semibold">Dni nazaj</th>
                  <th className="px-3 py-3 text-center font-semibold">Tveganje</th>
                </tr>
              </thead>
              <tbody>
                {data.churnRisk.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-right">{c.visitCount}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(c.totalSpent)}</td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {c.daysSinceLastActivity}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        variant="outline"
                        className={
                          c.daysSinceLastActivity > 180
                            ? "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                            : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        }
                      >
                        {c.daysSinceLastActivity > 180 ? "Visoko" : "Srednje"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Top stranke po obiskih */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <UserCheck className="h-5 w-5" />
              Top po obiskih
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Stranka</th>
                  <th className="px-3 py-2 text-right font-semibold">Obiski</th>
                  <th className="px-3 py-2 text-right font-semibold">Poraba</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. košarica</th>
                </tr>
              </thead>
              <tbody>
                {data.topByVisits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Ni strank
                    </td>
                  </tr>
                ) : (
                  data.topByVisits.map((c, idx) => (
                    <tr key={c.id} className="border-b">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {idx < 3 && (
                            <span className="text-sm">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                          )}
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">{c.visitCount}</td>
                      <td className="px-3 py-2 text-right">{formatEUR(c.totalSpent)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">
                        {formatEUR(c.avgBasketSize)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top stranke po porabi */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Award className="h-5 w-5" />
              Top po porabi
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Stranka</th>
                  <th className="px-3 py-2 text-right font-semibold">Poraba</th>
                  <th className="px-3 py-2 text-right font-semibold">Obiski</th>
                  <th className="px-3 py-2 text-right font-semibold">Točk</th>
                </tr>
              </thead>
              <tbody>
                {data.topBySpent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Ni strank
                    </td>
                  </tr>
                ) : (
                  data.topBySpent.map((c, idx) => (
                    <tr key={c.id} className="border-b">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {idx < 3 && (
                            <span className="text-sm">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                          )}
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">
                        {formatEUR(c.totalSpent)}
                      </td>
                      <td className="px-3 py-2 text-right">{c.visitCount}</td>
                      <td className="px-3 py-2 text-right text-amber-600">{c.points}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Mesečne nove stranke */}
      {data.monthly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Calendar className="h-5 w-5" />
            Nove stranke po mesecih
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Mesec</th>
                  <th className="px-3 py-2 text-right font-semibold">Novih strank</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.slice(-12).map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-3 py-2 text-right font-bold">{m.newCustomers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {s.total === 0 && (
        <EmptyState
          icon={Users}
          title="Ni strank"
          description="Dodaj stranke v CRM za analizo retencije"
        />
      )}
    </div>
  );
}
