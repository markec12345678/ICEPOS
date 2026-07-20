"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  RefreshCw,
  Clock,
  Euro,
  TrendingUp,
  Calendar,
  Users,
  Timer,
  Award,
  ArrowDown,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface TableStat {
  tableId: string;
  tableNumber: number;
  tableName: string;
  seats: number;
  section: string;
  orderCount: number;
  totalRevenue: number;
  avgCheck: number;
  avgDurationMin: number;
  turnoverRate: number;
  revenuePerSeatPerDay: number;
  utilizationScore: number;
}

interface SectionAgg {
  section: string;
  tableCount: number;
  totalOrders: number;
  totalRevenue: number;
  avgTurnoverRate: number;
  avgDuration: number;
}

interface HourlyEntry {
  hour: number;
  orderCount: number;
}

interface Summary {
  totalTables: number;
  totalOrders: number;
  totalRevenue: number;
  avgCheck: number;
  avgTurnoverPerTable: number;
  avgDurationMin: number;
  avgTurnoverRatePerDay: number;
  peakHour: number;
  bestPerformingTable: string;
  worstPerformingTable: string;
  daysInPeriod: number;
}

interface TurnoverData {
  period: { from: string; to: string };
  tableStats: TableStat[];
  sectionSummary: SectionAgg[];
  hourly: HourlyEntry[];
  summary: Summary;
}

function formatDuration(min: number): string {
  if (min === 0) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function utilizationColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

export function TableTurnoverView() {
  const [data, setData] = useState<TurnoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/table-turnover${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju analitike miz");
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
          <h2 className="text-2xl font-bold">Obračanje miz</h2>
          <p className="text-sm text-muted-foreground">Analitika zasedenosti</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const maxHourlyOrders = Math.max(...data.hourly.map((h) => h.orderCount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <RefreshCw className="h-6 w-6 text-emerald-600" />
          Obračanje miz
        </h2>
        <p className="text-sm text-muted-foreground">
          Analitika zasedenosti, turnover rate in efficiency miz
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
          Obdobje: {data.period.from} – {data.period.to} ({s.daysInPeriod} dni)
        </p>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj računov</p>
              <p className="text-2xl font-bold">{s.totalOrders}</p>
              <p className="text-xs text-muted-foreground">{s.totalTables} miz</p>
            </div>
            <RefreshCw className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupni prihodek</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">pov. {formatEUR(s.avgCheck)} / račun</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. čas zasedenosti</p>
              <p className="text-2xl font-bold">{formatDuration(s.avgDurationMin)}</p>
            </div>
            <Timer className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. turnover/dan</p>
              <p className="text-2xl font-bold">{s.avgTurnoverRatePerDay.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">računov/mizo/dan</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Top in bottom mize */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Najboljša miza
              </p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.bestPerformingTable}
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <ArrowDown className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Najmanjša miza
              </p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {s.worstPerformingTable}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Povzetek po sekcijah */}
      {data.sectionSummary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Po sekcijah</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Sekcija</th>
                  <th className="px-3 py-2 text-right font-semibold">Mize</th>
                  <th className="px-3 py-2 text-right font-semibold">Računov</th>
                  <th className="px-3 py-2 text-right font-semibold">Prihodek</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. turnover</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. čas</th>
                </tr>
              </thead>
              <tbody>
                {data.sectionSummary.map((sec) => (
                  <tr key={sec.section} className="border-b">
                    <td className="px-3 py-2 font-medium">{sec.section}</td>
                    <td className="px-3 py-2 text-right">{sec.tableCount}</td>
                    <td className="px-3 py-2 text-right">{sec.totalOrders}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatEUR(sec.totalRevenue)}</td>
                    <td className="px-3 py-2 text-right">{sec.avgTurnoverRate.toFixed(1)}/dan</td>
                    <td className="px-3 py-2 text-right">{formatDuration(Math.round(sec.avgDuration))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Urna analiza */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">
          Urna analiza (peak: {s.peakHour}:00 - {s.peakHour + 1}:00)
        </h3>
        <div className="flex items-end gap-1" style={{ height: "120px" }}>
          {data.hourly.map((h) => (
            <div
              key={h.hour}
              className="flex flex-1 flex-col items-center justify-end"
              title={`${h.hour}:00 - ${h.orderCount} računov`}
            >
              <div
                className={`w-full rounded-t ${
                  h.orderCount === maxHourlyOrders && h.orderCount > 0
                    ? "bg-emerald-500"
                    : h.orderCount > 0
                    ? "bg-emerald-300 dark:bg-emerald-700"
                    : "bg-muted"
                }`}
                style={{
                  height: `${(h.orderCount / maxHourlyOrders) * 100}%`,
                  minHeight: h.orderCount > 0 ? "4px" : "2px",
                }}
              />
              <span className="mt-1 text-[8px] text-muted-foreground">{h.hour}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabela miz */}
      {data.tableStats.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="Ni podatkov"
          description="Ni računov v izbranem obdobju"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Analitika po mizah</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Miza</th>
                  <th className="px-3 py-3 text-left font-semibold">Sekcija</th>
                  <th className="px-3 py-3 text-right font-semibold">Sedeži</th>
                  <th className="px-3 py-3 text-right font-semibold">Računov</th>
                  <th className="px-3 py-3 text-right font-semibold">Prihodek</th>
                  <th className="px-3 py-3 text-right font-semibold">Pov. ček</th>
                  <th className="px-3 py-3 text-right font-semibold">Čas</th>
                  <th className="px-3 py-3 text-right font-semibold">Turnover/dan</th>
                  <th className="px-3 py-3 text-right font-semibold">€/sedež/dan</th>
                  <th className="px-3 py-3 text-center font-semibold">Izkoriščenost</th>
                </tr>
              </thead>
              <tbody>
                {data.tableStats.map((t) => (
                  <tr key={t.tableId} className="border-b">
                    <td className="px-3 py-3 font-medium">{t.tableName}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{t.section}</td>
                    <td className="px-3 py-3 text-right">
                      <Users className="mr-1 inline h-3 w-3 text-muted-foreground" />
                      {t.seats}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{t.orderCount}</td>
                    <td className="px-3 py-3 text-right">{formatEUR(t.totalRevenue)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{formatEUR(t.avgCheck)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatDuration(t.avgDurationMin)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold">{t.turnoverRate}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">
                      {formatEUR(t.revenuePerSeatPerDay)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
                              t.utilizationScore >= 80
                                ? "bg-emerald-500"
                                : t.utilizationScore >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${t.utilizationScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${utilizationColor(t.utilizationScore)}`}>
                          {t.utilizationScore.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
