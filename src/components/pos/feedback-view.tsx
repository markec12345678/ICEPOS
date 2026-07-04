"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Utensils,
  Bell,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { KpiSkeleton, ListSkeleton, LoadingSpinner, ErrorState } from "@/components/pos/loading-states";

interface Feedback {
  id: string;
  orderId: string | null;
  customerId: string | null;
  customerName: string | null;
  foodRating: number;
  serviceRating: number;
  ambienceRating: number | null;
  overallRating: number;
  comment: string | null;
  tags: string | null;
  resolved: boolean;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
}

interface FeedbackSummary {
  total: number;
  avgFood: number;
  avgService: number;
  avgOverall: number;
  unresolved: number;
  ratingDistribution: { stars: number; count: number }[];
  topTags: { tag: string; count: number }[];
  trend: number;
  recentAvg: number;
}

const TAG_LABELS: Record<string, { sl: string; icon: string }> = {
  fast_service: { sl: "Hitra postrežba", icon: "⚡" },
  delicious: { sl: "Odlična hrana", icon: "😋" },
  friendly_staff: { sl: "Prijazno osebje", icon: "😊" },
  good_value: { sl: "Dobra cena", icon: "💰" },
  clean: { sl: "Čisto", icon: "✨" },
  cold_food: { sl: "Hladna hrana", icon: "❄️" },
  slow_service: { sl: "Počasna postrežba", icon: "🐌" },
  rude_staff: { sl: "Neprijazno osebje", icon: "😠" },
  overpriced: { sl: "Predrago", icon: "💸" },
  dirty: { sl: "Nečisto", icon: "🧹" },
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3 w-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            sizeClass,
            s <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function FeedbackView() {
  const [data, setData] = useState<{ feedbacks: Feedback[]; summary: FeedbackSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [filter, setFilter] = useState<"all" | "unresolved" | "low">("all");
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback?days=${days}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju povratnih informacij");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  async function respondToFeedback(id: string) {
    const text = responseText[id]?.trim();
    if (!text) {
      toast.error("Vnesi odgovor");
      return;
    }
    setResponding(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: text, resolved: true }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success("Odgovor poslan");
      setResponseText((prev) => ({ ...prev, [id]: "" }));
      load();
    } catch {
      toast.error("Napaka pri pošiljanju odgovora");
    } finally {
      setResponding(null);
    }
  }

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const { feedbacks, summary } = data;

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filter === "unresolved") return !f.resolved;
    if (filter === "low") return f.overallRating <= 2;
    return true;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Povratne informacije strank</h2>
          <p className="text-sm text-muted-foreground">
            Ocene jedi, strežbe in izkušnje gostov — zadnjih {days} dni
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
          </SelectContent>
        </Select>
      </div>

      {/* Skupne metrike */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupna ocena</p>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <p className="text-2xl font-bold">{summary.avgOverall.toFixed(1)}</p>
            <span className="text-sm text-muted-foreground">/5</span>
          </div>
          <StarRating rating={Math.round(summary.avgOverall)} />
          {summary.trend !== 0 && (
            <p className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              summary.trend > 0 ? "text-emerald-600" : "text-rose-600"
            )}>
              {summary.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {summary.trend > 0 ? "+" : ""}{summary.trend} vs prejšnji teden
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Hrana</p>
            <Utensils className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.avgFood.toFixed(1)}</p>
          <StarRating rating={Math.round(summary.avgFood)} />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Strežba</p>
            <Bell className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.avgService.toFixed(1)}</p>
          <StarRating rating={Math.round(summary.avgService)} />
        </Card>

        <Card className={cn(
          "p-4",
          summary.unresolved > 0 && "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Nerešeni</p>
            <AlertCircle className={cn("h-4 w-4", summary.unresolved > 0 ? "text-amber-500" : "text-emerald-500")} />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.unresolved}</p>
          <p className="text-xs text-muted-foreground">čaka na odgovor</p>
        </Card>
      </div>

      {/* Distribucija ocen */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Star className="h-4 w-4 text-amber-400" />
          Distribucija ocen
        </h3>
        <div className="space-y-2">
          {summary.ratingDistribution.slice().reverse().map((r) => {
            const max = Math.max(...summary.ratingDistribution.map((x) => x.count), 1);
            return (
              <div key={r.stars} className="flex items-center gap-2">
                <span className="flex w-12 items-center gap-1 text-xs">
                  {r.stars} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-muted/50">
                  <div
                    className={cn(
                      "h-full rounded transition-all",
                      r.stars >= 4 ? "bg-emerald-400" : r.stars === 3 ? "bg-amber-400" : "bg-rose-400"
                    )}
                    style={{ width: `${(r.count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs text-muted-foreground">{r.count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tag analitika */}
      {summary.topTags.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ThumbsUp className="h-4 w-4 text-sky-500" />
            Pogoste oznake
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.topTags.map((t) => {
              const label = TAG_LABELS[t.tag];
              return (
                <Badge
                  key={t.tag}
                  variant="outline"
                  className="gap-1.5"
                  title={label?.sl || t.tag}
                >
                  {label?.icon || "🏷️"} {label?.sl || t.tag} ({t.count})
                </Badge>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Vsi ({feedbacks.length})
        </Button>
        <Button
          variant={filter === "unresolved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("unresolved")}
          className={filter === "unresolved" && summary.unresolved > 0 ? "bg-amber-600 hover:bg-amber-700" : ""}
        >
          Nerešeni ({summary.unresolved})
        </Button>
        <Button
          variant={filter === "low" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("low")}
          className={filter === "low" ? "bg-rose-600 hover:bg-rose-700" : ""}
        >
          Nizke ocene (≤2★)
        </Button>
      </div>

      {/* Seznam feedbackov */}
      <div className="space-y-3">
        {filteredFeedbacks.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">Ni povratnih informacij za ta filter.</p>
          </Card>
        ) : (
          filteredFeedbacks.map((f) => {
            const tags = f.tags ? (() => { try { return JSON.parse(f.tags) as string[]; } catch { return []; } })() : [];
            return (
              <Card key={f.id} className={cn(
                "p-4",
                !f.resolved && f.overallRating <= 2 && "border-rose-300 dark:border-rose-800",
                f.resolved && "border-emerald-200 dark:border-emerald-800"
              )}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <StarRating rating={f.overallRating} size="md" />
                      <span className="text-sm font-semibold">
                        {f.customerName || "Anonimni gost"}
                      </span>
                      {f.resolved ? (
                        <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Rešeno
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Čaka
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>🍽️ Hrana: <strong className="text-foreground">{f.foodRating}★</strong></span>
                      <span>🔔 Strežba: <strong className="text-foreground">{f.serviceRating}★</strong></span>
                      {f.ambienceRating && (
                        <span>🏠 Ambient: <strong className="text-foreground">{f.ambienceRating}★</strong></span>
                      )}
                      <span>📅 {new Date(f.createdAt).toLocaleDateString("sl-SI")}</span>
                    </div>
                    {f.comment && (
                      <p className="mt-2 text-sm italic text-muted-foreground">
                        &ldquo;{f.comment}&rdquo;
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((t) => {
                          const label = TAG_LABELS[t];
                          return (
                            <span key={t} className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-[10px]">
                              {label?.icon || "🏷️"} {label?.sl || t}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {f.response && (
                      <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-800 dark:bg-emerald-950/20">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          ↳ Odgovor restavracije:
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">{f.response}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Odgovor input */}
                {!f.resolved && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="Odgovori gostu..."
                      value={responseText[f.id] || ""}
                      onChange={(e) => setResponseText((prev) => ({ ...prev, [f.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") respondToFeedback(f.id);
                      }}
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <Button
                      size="sm"
                      onClick={() => respondToFeedback(f.id)}
                      disabled={responding === f.id}
                    >
                      {responding === f.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Odgovori"
                      )}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
