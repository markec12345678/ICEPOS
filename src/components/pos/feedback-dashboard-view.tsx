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
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface RatingDist {
  star: number;
  count: number;
  percentage: number;
}

interface TagEntry {
  tag: string;
  count: number;
}

interface MonthlyEntry {
  month: string;
  count: number;
  avgRating: number;
  totalRating: number;
}

interface LowRatedItem {
  id: string;
  customerName: string | null;
  foodRating: number;
  serviceRating: number;
  overallRating: number;
  comment: string | null;
  tags: string | null;
  createdAt: string;
}

interface RecentItem {
  id: string;
  customerName: string | null;
  foodRating: number;
  serviceRating: number;
  ambienceRating: number | null;
  overallRating: number;
  comment: string | null;
  tags: string | null;
  resolved: boolean;
  response: string | null;
  createdAt: string;
}

interface DashboardData {
  period: { from: string; to: string };
  summary: {
    total: number;
    resolved: number;
    unresolved: number;
    resolutionRate: number;
    avgFoodRating: number;
    avgServiceRating: number;
    avgAmbienceRating: number;
    avgOverall: number;
    nps: number;
    promoters: number;
    passives: number;
    detractors: number;
  };
  ratingDistribution: RatingDist[];
  positiveTags: TagEntry[];
  negativeTags: TagEntry[];
  monthly: MonthlyEntry[];
  lowRated: LowRatedItem[];
  recent: RecentItem[];
}

const TAG_LABELS: Record<string, string> = {
  fast_service: "Hitra strežba",
  delicious: "Odlična hrana",
  friendly_staff: "Prijazno osebje",
  clean: "Čisto",
  great_atmosphere: "Odličen ambient",
  good_value: "Dobra vrednost",
  fresh_food: "Sveža hrana",
  generous_portions: "Velike porcije",
  slow_service: "Počasna strežba",
  cold_food: "Hladna hrana",
  rude_staff: "Neprijazno osebje",
  dirty: "Umazano",
  overpriced: "Predrago",
  small_portions: "Majhne porcije",
  bland: "Brez okusa",
  undercooked: "Nedokuhanо",
};

function tagLabel(tag: string): string {
  return TAG_LABELS[tag] || tag;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });
}

function npsColor(nps: number): string {
  if (nps >= 50) return "text-emerald-600";
  if (nps >= 0) return "text-amber-600";
  return "text-rose-600";
}

export function FeedbackDashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
      const url = `/api/feedback-dashboard${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju analitike povratnih informacij");
    } finally {
      setLoading(false);
    }
  }, [from, to, resolvedFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Nadzorna plošča povratnih informacij</h2>
          <p className="text-sm text-muted-foreground">Napredna analitika ocen gostov</p>
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
          <MessageSquare className="h-6 w-6 text-emerald-600" />
          Nadzorna plošča povratnih informacij
        </h2>
        <p className="text-sm text-muted-foreground">
          Napredna analitika ocen, NPS, trendov in komentarjev gostov
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
          <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vse</SelectItem>
              <SelectItem value="resolved">Rešeno</SelectItem>
              <SelectItem value="unresolved">Nerešeno</SelectItem>
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
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj ocen</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. ocena</p>
              <p className="flex items-center gap-1 text-2xl font-bold text-amber-600">
                {s.avgOverall.toFixed(1)}
                <Star className="h-5 w-5 fill-current" />
              </p>
            </div>
            <Star className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">NPS score</p>
              <p className={`text-2xl font-bold ${npsColor(s.nps)}`}>
                {s.nps > 0 ? "+" : ""}{s.nps}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Rešene</p>
              <p className="text-2xl font-bold text-emerald-600">
                {s.resolutionRate.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {s.resolved}/{s.total}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
      </div>

      {/* NPS breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <ThumbsUp className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Promoterji (5★)
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.promoters}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                {s.total > 0 ? ((s.promoters / s.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Pasivni (4★)
              </p>
              <p className="text-2xl font-bold">{s.passives}</p>
              <p className="text-xs text-muted-foreground">
                {s.total > 0 ? ((s.passives / s.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center gap-3">
            <ThumbsDown className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Kritiki (1-3★)
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.detractors}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {s.total > 0 ? ((s.detractors / s.total) * 100).toFixed(0) : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Povprečne ocene po kategorijah */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Ocene po kategorijah</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Hrana</span>
              <span className="font-bold">{s.avgFoodRating.toFixed(1)} ★</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(s.avgFoodRating / 5) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Strežba</span>
              <span className="font-bold">{s.avgServiceRating.toFixed(1)} ★</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${(s.avgServiceRating / 5) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ambient</span>
              <span className="font-bold">
                {s.avgAmbienceRating > 0 ? `${s.avgAmbienceRating.toFixed(1)} ★` : "—"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${(s.avgAmbienceRating / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Distribucija ocen */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Distribucija ocen</h3>
        <div className="space-y-2">
          {data.ratingDistribution.slice().reverse().map((r) => (
            <div key={r.star} className="flex items-center gap-3">
              <div className="flex w-12 items-center gap-1 text-sm">
                <span className="font-medium">{r.star}</span>
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              </div>
              <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                <div
                  className="flex h-full items-center justify-end rounded bg-amber-500 pr-2 text-xs font-bold text-white"
                  style={{ width: `${Math.max(r.percentage, r.count > 0 ? 8 : 0)}%` }}
                >
                  {r.count > 0 && r.percentage > 5 && `${r.count}`}
                </div>
              </div>
              <span className="w-12 text-right text-xs text-muted-foreground">
                {r.percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Tag analiza */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.positiveTags.length > 0 && (
          <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
              <ThumbsUp className="h-5 w-5" />
              Pozitivni komentarji
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.positiveTags.map((t) => (
                <Badge
                  key={t.tag}
                  variant="outline"
                  className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                >
                  {tagLabel(t.tag)} ({t.count})
                </Badge>
              ))}
            </div>
          </Card>
        )}
        {data.negativeTags.length > 0 && (
          <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-800 dark:text-rose-200">
              <ThumbsDown className="h-5 w-5" />
              Negativni komentarji
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.negativeTags.map((t) => (
                <Badge
                  key={t.tag}
                  variant="outline"
                  className="border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {tagLabel(t.tag)} ({t.count})
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Nizke ocene (prioriteta) */}
      {data.lowRated.length > 0 && (
        <Card className="border-rose-200 p-4 dark:border-rose-900">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5" />
            Nizke ocene — prioriteta za odgovor ({data.lowRated.length})
          </h3>
          <div className="space-y-2">
            {data.lowRated.map((item) => (
              <div key={item.id} className="rounded border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-800 dark:bg-rose-950/20">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.customerName || "Gost"}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= item.overallRating
                              ? "fill-rose-500 text-rose-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>
                {item.comment && (
                  <p className="text-sm italic text-muted-foreground">"{item.comment}"</p>
                )}
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>Hrana: {item.foodRating}★</span>
                  <span>Strežba: {item.serviceRating}★</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mesečni trend */}
      {data.monthly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Mesečni trend</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Mesec</th>
                  <th className="px-3 py-2 text-right font-semibold">Št. ocen</th>
                  <th className="px-3 py-2 text-right font-semibold">Pov. ocena</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.slice(-12).map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-3 py-2 text-right">{m.count}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <span className="font-bold text-amber-600">{m.avgRating.toFixed(1)}</span>
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Najnovejše */}
      {data.recent.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Najnovejše ocene</h3>
          </div>
          <div className="divide-y">
            {data.recent.map((item) => (
              <div key={item.id} className="p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.customerName || "Gost"}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= item.overallRating
                              ? "fill-amber-500 text-amber-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    {item.resolved ? (
                      <Badge variant="outline" className="text-emerald-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Rešeno
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600">
                        <Clock className="mr-1 h-3 w-3" />
                        Na čakanju
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                </div>
                {item.comment && (
                  <p className="text-sm italic text-muted-foreground">"{item.comment}"</p>
                )}
                {item.response && (
                  <p className="mt-1 rounded bg-muted/30 p-2 text-xs">
                    <span className="font-medium">Odgovor:</span> {item.response}
                  </p>
                )}
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>Hrana: {item.foodRating}★</span>
                  <span>Strežba: {item.serviceRating}★</span>
                  {item.ambienceRating && <span>Ambient: {item.ambienceRating}★</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {s.total === 0 && (
        <EmptyState
          icon={MessageSquare}
          title="Ni povratnih informacij"
          description="Povratne informacije se zbirajo preko QR kode ali povratnih obrazcev"
        />
      )}
    </div>
  );
}
