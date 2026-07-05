"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, RefreshCw, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";

interface ActivityItem {
  id: string;
  type: "paid" | "order" | "reservation" | "tip";
  timestamp: string;
  title: string;
  description: string;
  amount?: number;
  tableName?: string;
  operator?: string;
  icon: string;
  color: string;
}

const COLOR_CLASSES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
};

function formatRelativeTime(timestamp: string, now: Date): string {
  const diff = now.getTime() - new Date(timestamp).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);

  if (sec < 60) return "zdaj";
  if (min < 60) return `pred ${min} min`;
  if (hour < 24) return `pred ${hour} h`;
  return `pred ${Math.floor(hour / 24)} d`;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useNow(30000); // vsakih 30s za relative time

  async function load() {
    try {
      const res = await fetch("/api/activity-feed?limit=15");
      if (!res.ok) throw new Error("Napaka");
      const data = await res.json();
      setActivities(data.activities || []);
    } catch {
      // tiha napaka
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh vsakih 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-amber-600" />
            Aktivnosti danes
          </h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-amber-600" />
          Aktivnosti danes
          <Badge variant="secondary" className="text-[10px]">
            {activities.length}
          </Badge>
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Osveži" aria-label="Osveži">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Še ni aktivnosti danes.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Aktivnosti se prikažejo, ko pride do plačil, naročil ali rezervacij.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {activities.map((a, i) => (
            <div
              key={a.id}
              className={cn(
                "flex items-start gap-3 p-3 transition-colors hover:bg-muted/30",
                i !== activities.length - 1 && "border-b border-border/40"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base",
                  COLOR_CLASSES[a.color] || "bg-muted text-foreground"
                )}
              >
                {a.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeTime(a.timestamp, now)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{a.description}</p>
                {a.amount !== undefined && a.amount > 0 && (
                  <p className={cn(
                    "mt-0.5 inline-flex items-center gap-1 text-xs font-semibold",
                    a.type === "tip" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    <TrendingUp className="h-3 w-3" />
                    {formatEUR(a.amount)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
