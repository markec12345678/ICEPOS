"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Users,
  Package,
  Target,
  Sparkles,
  Calendar,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { KpiSkeleton, ListSkeleton, LoadingSpinner, ErrorState } from "@/components/pos/loading-states";

interface ForecastDay {
  date: string;
  dayOfWeek: number;
  dayName: string;
  predictedRevenue: number;
  predictedOrders: number;
  predictedAvgOrder: number;
  confidence: number;
  staffingRecommendation: string;
  sampleSize: number;
}

interface ForecastSummary {
  avgDailyRevenue: number;
  avgDailyOrders: number;
  trendGrowth: number;
  confidence: number;
  totalHistoricalDays: number;
  totalHistoricalOrders: number;
}

interface TopItem {
  menuItemId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  avgPerDay: number;
  recommendation: string;
}

interface ForecastData {
  forecast: ForecastDay[];
  summary: ForecastSummary;
  topItems: TopItem[];
  historicalDays: { date: string; revenue: number; orders: number }[];
  message?: string;
}

const STAFFING_COLORS: Record<string, string> = {
  "Polna": "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
  "Standardna": "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  "Minimalna": "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  "Ena oseba": "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
};

function getStaffingColor(rec: string): string {
  for (const key of Object.keys(STAFFING_COLORS)) {
    if (rec.includes(key)) return STAFFING_COLORS[key];
  }
  return "border-border";
}

export function ForecastView() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("7");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecast?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju napovedi");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">
          <Brain className="mx-auto mb-2 h-8 w-8 animate-pulse" />
          Analiziram zgodovino in napovedujem...
        </div>
      </div>
    );
  }

  if (data.message) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <Brain className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="font-medium">{data.message}</p>
      </div>
    );
  }

  const trendUp = data.summary.trendGrowth >= 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Demand Forecasting
          </h2>
          <p className="text-sm text-muted-foreground">
            Napoved povpraševanja na podlagi {data.summary.totalHistoricalDays} dni zgodovine
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 dni</SelectItem>
            <SelectItem value="7">7 dni</SelectItem>
            <SelectItem value="14">14 dni</SelectItem>
            <SelectItem value="30">30 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. dnevni promet</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.avgDailyRevenue)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. dnevni računi</p>
              <p className="text-xl font-bold">{data.summary.avgDailyOrders}</p>
            </div>
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className={`p-4 ${trendUp ? "border-emerald-300 dark:border-emerald-800" : "border-rose-300 dark:border-rose-800"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Trend rasti</p>
              <p className={`text-xl font-bold ${trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {trendUp ? "+" : ""}{data.summary.trendGrowth}%
              </p>
            </div>
            {trendUp ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-rose-500" />
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Confidence</p>
              <p className="text-xl font-bold">{data.summary.confidence}%</p>
              <p className="text-xs text-muted-foreground">
                {data.summary.totalHistoricalOrders} računov
              </p>
            </div>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
        </Card>
      </div>

      {/* Forecast table */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4" />
            Napoved za naslednjih {data.forecast.length} dni
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">Dan</th>
                <th className="p-3 text-right font-medium">Napoved prometa</th>
                <th className="p-3 text-right font-medium">Računi</th>
                <th className="p-3 text-right font-medium">Povp. račun</th>
                <th className="p-3 text-right font-medium">Confidence</th>
                <th className="p-3 text-left font-medium">Priporočilo osebja</th>
              </tr>
            </thead>
            <tbody>
              {data.forecast.map((d) => (
                <tr key={d.date} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{d.dayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(d.date).toLocaleDateString("sl-SI")}
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold text-primary">
                    {formatEUR(d.predictedRevenue)}
                  </td>
                  <td className="p-3 text-right font-mono">{d.predictedOrders}</td>
                  <td className="p-3 text-right">{formatEUR(d.predictedAvgOrder)}</td>
                  <td className="p-3 text-right">
                    <Badge
                      variant="outline"
                      className={
                        d.confidence > 70
                          ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                          : d.confidence > 40
                          ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                          : "border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400"
                      }
                    >
                      {d.confidence}%
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={getStaffingColor(d.staffingRecommendation)}>
                      <Users className="mr-1 h-3 w-3" />
                      {d.staffingRecommendation}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Historical chart (mini) */}
      {data.historicalDays.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Zgodovina prometa (zadnjih 30 dni)</h3>
          <div className="flex h-32 items-end gap-1 overflow-x-auto">
            {data.historicalDays.map((d) => {
              const maxRev = Math.max(...data.historicalDays.map((x) => x.revenue), 1);
              const height = (d.revenue / maxRev) * 100;
              return (
                <div
                  key={d.date}
                  className="group relative flex shrink-0 flex-col items-center"
                  style={{ width: 20 }}
                  title={`${d.date}: ${formatEUR(d.revenue)}`}
                >
                  <div
                    className="w-full rounded-t bg-purple-500 transition-all hover:bg-purple-600"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="mt-1 text-[8px] text-muted-foreground">
                    {d.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top items — priporočilo zaloge */}
      {data.topItems.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4" />
              Priporočilo zaloge (top {data.topItems.length} item-ov)
            </h3>
          </div>
          <div className="space-y-2 p-3">
            {data.topItems.map((item, i) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.totalQuantity} prodanih · {formatEUR(item.totalRevenue)} · povp. {item.avgPerDay}/dan
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-400">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {item.recommendation}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako deluje napoved?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Statistični model</strong>: povprečje po dnevih v tednu + linearni trend.</p>
          <p>• <strong>Confidence</strong>: višji z več zgodovine (min 7 dni za 30%, 30 dni za 90%).</p>
          <p>• <strong>Trend rasti</strong>: pozitiven = rastoč promet, negativen = padajoč.</p>
          <p>• <strong>Priporočilo osebja</strong>: polna (4-5), standardna (3), minimalna (2), ena oseba.</p>
          <p>• <strong>Priporočilo zaloge</strong>: izračunano iz povprečne dnevne prodaje × št. dni.</p>
          <p>• V produkciji: nadgradite z ML modelom (ARIMA, Prophet) ali ZAI LLM za naprednejše napovedi.</p>
        </div>
      </Card>
    </div>
  );
}
