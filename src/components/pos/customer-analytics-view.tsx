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
  Users,
  TrendingUp,
  Repeat,
  UserPlus,
  Crown,
  Loader2,
  Phone,
  Mail,
  Clock,
  Coins,
  Gift,
  Sparkles,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { CLVAnalysis } from "@/components/pos/clv-analysis";
import { RetentionCohort } from "@/components/pos/retention-cohort";
import { FrequencyPrediction } from "@/components/pos/frequency-prediction";
import { KpiSkeleton, ListSkeleton, LoadingSpinner, ErrorState } from "@/components/pos/loading-states";

interface CustomerStat {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  totalSpent: number;
  visitCount: number;
  avgOrder: number;
  tips: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  level: string;
  segment: string;
}

interface AnalyticsData {
  customers: CustomerStat[];
  segments: { vip: number; regular: number; occasional: number; new: number; inactive: number };
  topCustomers: CustomerStat[];
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    totalVisits: number;
    avgCustomerValue: number;
    avgVisitsPerCustomer: number;
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
  };
  days: number;
}

const SEGMENT_CONFIG = {
  vip: { label: "VIP", color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400", icon: "👑" },
  regular: { label: "Redni", color: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400", icon: "⭐" },
  occasional: { label: "Občasni", color: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400", icon: "👤" },
  new: { label: "Novi", color: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400", icon: "🆕" },
  inactive: { label: "Neaktivni", color: "border-muted text-muted-foreground", icon: "💤" },
};

const LEVEL_ICONS: Record<string, string> = {
  Zlato: "🥇",
  Srebro: "🥈",
  Bronca: "🥉",
  Novinec: "🌱",
};

export function CustomerAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("90");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customer-analytics?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju analitike");
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
        <LoadingSpinner />
      </div>
    );
  }

  const filteredCustomers = segmentFilter === "all"
    ? data.customers
    : data.customers.filter((c) => c.segment === segmentFilter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6 text-blue-600" />
            CRM Analitika strank
          </h2>
          <p className="text-sm text-muted-foreground">
            Segmentacija, retention, VIP stranke — {data.days} dni
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 dni</SelectItem>
            <SelectItem value="30">30 dni</SelectItem>
            <SelectItem value="90">90 dni</SelectItem>
            <SelectItem value="365">1 leto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj strank</p>
              <p className="text-xl font-bold">{data.summary.totalCustomers}</p>
              <p className="text-xs text-emerald-600">+{data.summary.newCustomers} novih</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povprečna vrednost</p>
              <p className="text-xl font-bold">{formatEUR(data.summary.avgCustomerValue)}</p>
              <p className="text-xs text-muted-foreground">per stranka</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Retention rate</p>
              <p className="text-xl font-bold text-emerald-600">{data.summary.retentionRate}%</p>
              <p className="text-xs text-muted-foreground">{data.summary.returningCustomers} povratnih</p>
            </div>
            <Repeat className="h-5 w-5 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Povp. obiski</p>
              <p className="text-xl font-bold">{data.summary.avgVisitsPerCustomer}×</p>
              <p className="text-xs text-muted-foreground">{data.summary.totalVisits} skupno</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Segmentacija */}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Segmentacija strank</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(SEGMENT_CONFIG).map(([key, cfg]) => {
            const count = data.segments[key as keyof typeof data.segments] || 0;
            return (
              <button
                key={key}
                onClick={() => setSegmentFilter(segmentFilter === key ? "all" : key)}
                className={`rounded-xl border-2 p-3 text-center transition-all ${
                  segmentFilter === key ? cfg.color : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="text-2xl">{cfg.icon}</div>
                <p className="mt-1 text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 5 VIP stranke */}
      {data.topCustomers.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-gradient-to-r from-amber-500/10 to-orange-600/10 p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-amber-600" />
              Top 5 strank po porabi
            </h3>
          </div>
          <div className="divide-y">
            {data.topCustomers.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <span className="text-2xl">
                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {LEVEL_ICONS[c.level]} {c.level}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG]?.color}`}>
                      {SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG]?.icon} {SEGMENT_CONFIG[c.segment as keyof typeof SEGMENT_CONFIG]?.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>📞 {c.phone || "—"}</span>
                    <span>💰 {formatEUR(c.totalSpent)}</span>
                    <span>🔄 {c.visitCount} obiskov</span>
                    <span>📊 {formatEUR(c.avgOrder)} povp.</span>
                    <span>🎯 {c.points} točk</span>
                    {c.tips > 0 && <span>🤝 {formatEUR(c.tips)} napitnin</span>}
                    {c.daysSinceLastVisit !== null && (
                      <span>⏰ {c.daysSinceLastVisit === 0 ? "danes" : `pred ${c.daysSinceLastVisit} d`}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* VIP Nagrade — Milestone bonus točke */}
      <VipRewardsSection customers={data.customers} onRewardGiven={load} />

      {/* CLV analiza */}
      <CLVAnalysis />

      {/* Retention cohort analiza */}
      <RetentionCohort />

      {/* Frequency prediction — napoved vračanja strank */}
      <FrequencyPrediction />

      {/* Vse stranke tabela */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-3">
          <h3 className="text-sm font-semibold">
            Vse stranke ({filteredCustomers.length})
            {segmentFilter !== "all" && (
              <button
                onClick={() => setSegmentFilter("all")}
                className="ml-2 text-xs text-primary underline"
              >
                Počisti filter
              </button>
            )}
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
              <tr>
                <th className="p-2 text-left font-medium">Stranka</th>
                <th className="p-2 text-right font-medium">Obiski</th>
                <th className="p-2 text-right font-medium">Poraba</th>
                <th className="p-2 text-right font-medium">Povp.</th>
                <th className="p-2 text-right font-medium">Točke</th>
                <th className="p-2 text-center font-medium">Level</th>
                <th className="p-2 text-center font-medium">Zadnji obisk</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Ni strank v tem segmentu
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-2">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone || c.email || "—"}</p>
                    </td>
                    <td className="p-2 text-right font-mono">{c.visitCount}</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600">{formatEUR(c.totalSpent)}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{formatEUR(c.avgOrder)}</td>
                    <td className="p-2 text-right font-mono text-amber-600">{c.points}</td>
                    <td className="p-2 text-center">
                      <span className="text-sm">{LEVEL_ICONS[c.level]}</span>
                    </td>
                    <td className="p-2 text-center text-xs text-muted-foreground">
                      {c.daysSinceLastVisit === null
                        ? "—"
                        : c.daysSinceLastVisit === 0
                        ? "danes"
                        : `pred ${c.daysSinceLastVisit} d`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako uporabljati CRM analitiko?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>VIP</strong>: poraba ≥ 500€ ali ≥ 15 obiskov — ponudi ekskluzivne nagrade.</p>
          <p>• <strong>Redni</strong>: ≥ 5 obiskov ali ≥ 200€ — motiviraj z dvojnimi točkami.</p>
          <p>• <strong>Občasni</strong>: ≥ 1 obisk — pošlji ponudbo za vrnitev.</p>
          <p>• <strong>Novi</strong>: pridobljeni v obdobju — pošlji dobrodošel bonus.</p>
          <p>• <strong>Neaktivni</strong>: 0 obiskov v obdobju — reaktivacijska kampanja.</p>
          <p>• <strong>Retention rate</strong>: % strank z &gt;1 obiskom (višji = boljši).</p>
        </div>
      </Card>
    </div>
  );
}

// VIP Milestone konfiguracija
const VIP_MILESTONES = [
  { threshold: 500, bonusPoints: 50, label: "Bronca VIP", emoji: "🥉", color: "amber" },
  { threshold: 1000, bonusPoints: 100, label: "Srebro VIP", emoji: "🥈", color: "slate" },
  { threshold: 2000, bonusPoints: 250, label: "Zlato VIP", emoji: "🥇", color: "amber" },
  { threshold: 5000, bonusPoints: 500, label: "Platinum VIP", emoji: "💎", color: "violet" },
];

/**
 * VIP Rewards sekcija — prikaže stranke, ki so dosegle VIP milestone,
 * in omogoča dodelitev bonus točk z enim klikom.
 */
function VipRewardsSection({
  customers,
  onRewardGiven,
}: {
  customers: CustomerStat[];
  onRewardGiven: () => void;
}) {
  const [rewarding, setRewarding] = useState<string | null>(null);

  // Najdi stranke, ki so dosegle vsaj en milestone (>= 500€)
  const vipEligible = customers.filter((c) => c.totalSpent >= 500);

  // Za vsako VIP stranko izračunaj dobljene in naslednji milestone
  const vipData = vipEligible.map((c) => {
    const achieved = VIP_MILESTONES.filter((m) => c.totalSpent >= m.threshold);
    const nextMilestone = VIP_MILESTONES.find((m) => c.totalSpent < m.threshold);
    const highestAchieved = achieved[achieved.length - 1];
    return {
      ...c,
      achieved,
      nextMilestone,
      highestAchieved,
    };
  });

  async function grantBonus(customerId: string, threshold: number, customerName: string) {
    setRewarding(customerId);
    try {
      const res = await fetch(`/api/customers/${customerId}/vip-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneThreshold: threshold }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success(data.message || `Bonus točke dodeljene!`, {
        description: `${customerName} — prejeto ${data.milestone.bonusPoints} točk`,
      });
      onRewardGiven();
    } catch (e) {
      toast.error("Napaka pri dodeljevanju bonusa", {
        description: e instanceof Error ? e.message : "Neznana napaka",
      });
    } finally {
      setRewarding(null);
    }
  }

  if (vipData.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gift className="h-4 w-4" />
          <span>
            VIP nagrade se aktivirajo, ko stranka porabi vsaj <strong>500 €</strong>.
            Trenutno še ni VIP strank — spodbujajte vračanje gostov!
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          VIP Nagrade — Milestone bonus točke
          <Badge variant="secondary" className="ml-1">{vipData.length} upravičenih</Badge>
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Dodeli bonus točke strankam, ki so dosegle VIP milestone. Pridelijo se avtomatsko ob dosegu praga porabe.
        </p>
      </div>
      <div className="divide-y">
        {vipData.slice(0, 10).map((c) => (
          <div key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{c.name}</p>
                {c.highestAchieved && (
                  <Badge variant="outline" className="gap-1 border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
                    {c.highestAchieved.emoji} {c.highestAchieved.label}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>💰 {formatEUR(c.totalSpent)} skupaj</span>
                <span>🎯 {c.points} točk</span>
                <span>🔄 {c.visitCount} obiskov</span>
                {c.nextMilestone && (
                  <span className="text-amber-600 dark:text-amber-400">
                    → Naslednji: {c.nextMilestone.emoji} {c.nextMilestone.label} ({formatEUR(c.nextMilestone.threshold - c.totalSpent)} do)
                  </span>
                )}
              </div>
              {/* Milestone badges */}
              <div className="mt-2 flex flex-wrap gap-1">
                {VIP_MILESTONES.map((m) => {
                  const achieved = c.totalSpent >= m.threshold;
                  return (
                    <span
                      key={m.threshold}
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        achieved
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.emoji} {m.label}
                      {achieved && <span>✓</span>}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              {VIP_MILESTONES.filter((m) => c.totalSpent >= m.threshold).map((m) => (
                <Button
                  key={m.threshold}
                  size="sm"
                  variant="outline"
                  className="gap-1 border-violet-300 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/50"
                  disabled={rewarding === c.id}
                  onClick={() => grantBonus(c.id, m.threshold, c.name)}
                  title={`Dodeli ${m.bonusPoints} bonus točk (${m.label})`}
                >
                  {rewarding === c.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Gift className="h-3 w-3" />
                  )}
                  +{m.bonusPoints}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
