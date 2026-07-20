"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Star,
  Users,
  Euro,
  TrendingUp,
  Sparkles,
  Search,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Tier {
  key: string;
  label: string;
  minSpent: number;
  color: string;
  discountPercent: number;
  pointsMultiplier: number;
  perks: string[];
}

interface TierCount extends Tier {
  customerCount: number;
  totalSpent: number;
  totalPoints: number;
  avgSpent: number;
}

interface TopCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalSpent: number;
  visitCount: number;
  points: number;
  currentTier: string;
  currentTierLabel: string;
  nextTier: string | null;
  progressToNext: number;
  remainingToNext: number;
}

interface NearUpgrade {
  id: string;
  name: string;
  totalSpent: number;
  currentTier: string;
  nextTier: string | null;
  progressToNext: number;
  remainingToNext: number;
}

interface LoyaltyData {
  tiers: Tier[];
  tierCounts: TierCount[];
  topCustomers: TopCustomer[];
  nearUpgrade: NearUpgrade[];
  summary: {
    totalCustomers: number;
    totalSpent: number;
    totalPoints: number;
    avgSpentPerCustomer: number;
  };
}

const TIER_ICONS: Record<string, typeof Trophy> = {
  bronze: Award,
  silver: Medal,
  gold: Trophy,
  platinum: Crown,
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: {
    bg: "bg-amber-100 dark:bg-amber-950/30",
    text: "text-amber-800 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-800",
  },
  silver: {
    bg: "bg-slate-100 dark:bg-slate-900/30",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-700",
  },
  gold: {
    bg: "bg-yellow-100 dark:bg-yellow-950/30",
    text: "text-yellow-800 dark:text-yellow-300",
    border: "border-yellow-300 dark:border-yellow-800",
  },
  platinum: {
    bg: "bg-purple-100 dark:bg-purple-950/30",
    text: "text-purple-800 dark:text-purple-300",
    border: "border-purple-300 dark:border-purple-800",
  },
};

export function LoyaltyTiersView() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loyalty-tiers", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju nivojev zvestobe");
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
          <h2 className="text-2xl font-bold">Nivoji zvestobe</h2>
          <p className="text-sm text-muted-foreground">Večnivojski zvestobni program</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const filteredTop = data.topCustomers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Crown className="h-6 w-6 text-purple-600" />
          Nivoji zvestobe
        </h2>
        <p className="text-sm text-muted-foreground">
          Večnivojski zvestobni program — Bron / Srebro / Zlato / Platina
        </p>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj strank</p>
              <p className="text-2xl font-bold">{s.totalCustomers}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupna poraba</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalSpent)}</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Točk skupaj</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{s.totalPoints}</p>
            </div>
            <Star className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. poraba/stranka</p>
              <p className="text-2xl font-bold">{formatEUR(s.avgSpentPerCustomer)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Tier kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.tierCounts.map((tier) => {
          const Icon = TIER_ICONS[tier.key] || Award;
          const colors = TIER_COLORS[tier.key] || TIER_COLORS.bronze;
          return (
            <Card key={tier.key} className={`border-2 p-4 ${colors.border} ${colors.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-8 w-8 ${colors.text}`} />
                  <div>
                    <p className={`font-bold ${colors.text}`}>{tier.label}</p>
                    <p className="text-xs text-muted-foreground">
                      od {formatEUR(tier.minSpent)}
                    </p>
                  </div>
                </div>
                {tier.discountPercent > 0 && (
                  <Badge variant="outline" className={colors.text}>
                    -{tier.discountPercent}%
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Strank:</span>
                  <span className="font-bold">{tier.customerCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Poraba:</span>
                  <span className="font-medium">{formatEUR(tier.totalSpent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Točk:</span>
                  <span className="font-medium">{tier.totalPoints}</span>
                </div>
                {tier.customerCount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pov. poraba:</span>
                    <span className="text-muted-foreground">{formatEUR(tier.avgSpent)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 border-t pt-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Ugodnosti</p>
                <ul className="mt-1 space-y-0.5">
                  {tier.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-1 text-[11px]">
                      <Sparkles className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-purple-500" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Blizu nadgradnje */}
      {data.nearUpgrade.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-purple-800 dark:text-purple-200">
            <Sparkles className="h-5 w-5" />
            Blizu nadgradnje ({data.nearUpgrade.length})
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.nearUpgrade.slice(0, 6).map((c) => (
              <div key={c.id} className="rounded border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  <Badge variant="outline" className="text-purple-600">
                    {c.progressToNext.toFixed(0)}%
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.currentTier} → {c.nextTier}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${c.progressToNext}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Še {formatEUR(c.remainingToNext)} do {c.nextTier}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top stranke */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold">Top stranke</h3>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Išči stranke..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="border-b">
                <th className="px-3 py-3 text-left font-semibold">Stranka</th>
                <th className="px-3 py-3 text-left font-semibold">Kontakt</th>
                <th className="px-3 py-3 text-right font-semibold">Poraba</th>
                <th className="px-3 py-3 text-right font-semibold">Obiskov</th>
                <th className="px-3 py-3 text-right font-semibold">Točk</th>
                <th className="px-3 py-3 text-center font-semibold">Nivo</th>
                <th className="px-3 py-3 text-left font-semibold">Napredek</th>
              </tr>
            </thead>
            <tbody>
              {filteredTop.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Ni strank, ki ustrezajo iskanju
                  </td>
                </tr>
              ) : (
                filteredTop.map((c, idx) => {
                  const tierIcon = TIER_ICONS[c.currentTier] || Award;
                  const colors = TIER_COLORS[c.currentTier] || TIER_COLORS.bronze;
                  const TierIcon = tierIcon;
                  return (
                    <tr key={c.id} className="border-b">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {idx < 3 && (
                            <span className="text-lg">
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                            </span>
                          )}
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {c.phone || c.email || "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">{formatEUR(c.totalSpent)}</td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{c.visitCount}</td>
                      <td className="px-3 py-3 text-right text-amber-700 dark:text-amber-400">{c.points}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={`${colors.border} ${colors.bg} ${colors.text}`}>
                          <TierIcon className="mr-1 h-3 w-3" />
                          {c.currentTierLabel}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        {c.nextTier ? (
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{c.progressToNext.toFixed(0)}%</span>
                              <span>→ {c.nextTier}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-purple-500"
                                style={{ width: `${c.progressToNext}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Še {formatEUR(c.remainingToNext)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-purple-600">Najvišji nivo ✓</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {s.totalCustomers === 0 && (
        <EmptyState
          icon={Crown}
          title="Ni strank"
          description="Dodaj stranke v CRM za prikaz nivojev zvestobe"
        />
      )}
    </div>
  );
}
