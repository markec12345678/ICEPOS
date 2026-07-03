"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trophy,
  TrendingUp,
  Receipt,
  Coins,
  Users,
  Crown,
  Loader2,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { ProductivityScore } from "@/components/pos/productivity-score";

interface EmployeePerf {
  operator: string;
  orders: number;
  revenue: number;
  tips: number;
  avgOrder: number;
  cashOrders: number;
  cardOrders: number;
}

interface PerfData {
  performance: EmployeePerf[];
  summary: {
    totalOperators: number;
    totalRevenue: number;
    totalOrders: number;
    totalTips: number;
    avgOrder: number;
    topPerformer: string;
  };
  days: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function EmployeePerformanceView() {
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employee-performance?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju statistike");
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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trophy className="h-6 w-6 text-amber-600" />
            Prodaja po operaterjih
          </h2>
          <p className="text-sm text-muted-foreground">
            Kdo prodaja največ? Pregled za {data.days} dni
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Danes</SelectItem>
            <SelectItem value="7">7 dni</SelectItem>
            <SelectItem value="30">30 dni</SelectItem>
            <SelectItem value="90">90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj promet</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.totalRevenue)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Št. računov</p>
              <p className="text-xl font-bold">{data.summary.totalOrders}</p>
            </div>
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. račun</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.avgOrder)}</p>
            </div>
            <Receipt className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Napitnine</p>
              <p className="text-xl font-bold text-amber-600">{formatEUR(data.summary.totalTips)}</p>
            </div>
            <Coins className="h-5 w-5 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Operaterji</p>
              <p className="text-xl font-bold">{data.summary.totalOperators}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Top performer banner */}
      {data.summary.topPerformer !== "—" && (
        <Card className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8" />
            <div>
              <p className="text-sm text-white/80">Top performer</p>
              <p className="text-2xl font-bold">{data.summary.topPerformer}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Performance table */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-3">
          <h3 className="text-sm font-semibold">Rangiranje operaterjev</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="p-3 text-left font-medium">#</th>
                <th className="p-3 text-left font-medium">Operater</th>
                <th className="p-3 text-right font-medium">Računi</th>
                <th className="p-3 text-right font-medium">Promet</th>
                <th className="p-3 text-right font-medium">Povp. račun</th>
                <th className="p-3 text-right font-medium">Napitnine</th>
                <th className="p-3 text-right font-medium">Gotovina</th>
                <th className="p-3 text-right font-medium">Kartica</th>
                <th className="p-3 text-right font-medium">Delež</th>
              </tr>
            </thead>
            <tbody>
              {data.performance.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Ni podatkov za izbrano obdobje
                  </td>
                </tr>
              ) : (
                data.performance.map((p, i) => {
                  const share = data.summary.totalRevenue > 0
                    ? Math.round((p.revenue / data.summary.totalRevenue) * 100)
                    : 0;
                  return (
                    <tr
                      key={p.operator}
                      className={`border-b last:border-0 hover:bg-muted/30 ${
                        i === 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                      }`}
                    >
                      <td className="p-3 text-lg">
                        {i < 3 ? MEDALS[i] : <span className="text-muted-foreground">{i + 1}</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.operator}</span>
                          {i === 0 && (
                            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                              <Crown className="mr-1 h-3 w-3" />
                              #1
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">{p.orders}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{formatEUR(p.revenue)}</td>
                      <td className="p-3 text-right font-mono">{formatEUR(p.avgOrder)}</td>
                      <td className="p-3 text-right font-mono text-amber-600">{formatEUR(p.tips)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{p.cashOrders}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{p.cardOrders}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako uporabljati to poročilo?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Top performer</strong> = operater z največjim prometom v izbranem obdobju.</p>
          <p>• <strong>Povp. račun</strong> = promet / št. računov (višji = boljši upselling).</p>
          <p>• <strong>Napitnine</strong> = skupne napitnine prejete pri računih tega operaterja.</p>
          <p>• <strong>Delež</strong> = koliko % skupnega prometa je prispeval ta operater.</p>
          <p>• Uporabi za motivacijo, bonuse in identifikacijo najboljših prodajalcev.</p>
        </div>
      </Card>

      {/* Productivity score */}
      <ProductivityScore />
    </div>
  );
}
