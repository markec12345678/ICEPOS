"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Flame, Trophy, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GoalData {
  goals: { daily: number; weekly: number; monthly: number };
  progress: {
    daily: { current: number; target: number; percent: number; remaining: number; isWeekend: boolean };
    weekly: { current: number; target: number; percent: number; remaining: number };
    monthly: { current: number; target: number; percent: number; remaining: number };
  };
}

function GoalCard({
  label,
  icon: Icon,
  data,
  color,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  data: { current: number; target: number; percent: number; remaining: number; isWeekend?: boolean };
  color: "amber" | "sky" | "violet";
}) {
  const achieved = data.percent >= 100;
  const hot = data.percent >= 80 && !achieved;

  const colorClasses = {
    amber: {
      bg: achieved ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : hot ? "border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : "border-amber-200 dark:border-amber-900",
      icon: achieved ? "text-emerald-600 dark:text-emerald-400" : hot ? "text-orange-500 dark:text-orange-400" : "text-amber-600 dark:text-amber-400",
      bar: achieved ? "bg-emerald-500" : hot ? "bg-orange-500" : "bg-amber-500",
      text: achieved ? "text-emerald-600 dark:text-emerald-400" : hot ? "text-orange-600 dark:text-orange-400" : "text-foreground",
    },
    sky: {
      bg: achieved ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-sky-200 dark:border-sky-900",
      icon: achieved ? "text-emerald-600 dark:text-emerald-400" : "text-sky-600 dark:text-sky-400",
      bar: achieved ? "bg-emerald-500" : "bg-sky-500",
      text: achieved ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
    },
    violet: {
      bg: achieved ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-violet-200 dark:border-violet-900",
      icon: achieved ? "text-emerald-600 dark:text-emerald-400" : "text-violet-600 dark:text-violet-400",
      bar: achieved ? "bg-emerald-500" : "bg-violet-500",
      text: achieved ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
    },
  };

  const c = colorClasses[color];

  return (
    <Card className={cn("p-4", c.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {achieved ? <CheckCircle2 className={cn("h-5 w-5", c.icon)} /> :
           hot ? <Flame className={cn("h-5 w-5", c.icon)} /> :
           <Icon className={cn("h-5 w-5", c.icon)} />}
          <div>
            <p className="text-xs font-semibold">{label}</p>
            {data.isWeekend && <Badge variant="secondary" className="text-[9px]">Vikend</Badge>}
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-bold", c.text)}>{data.percent}%</p>
          <p className="text-[10px] text-muted-foreground">
            {formatEUR(data.current)} / {formatEUR(data.target)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all duration-500", c.bar)}
          style={{ width: `${data.percent}%` }}
        />
      </div>

      {/* Status */}
      <div className="mt-2 flex items-center justify-between text-[10px]">
        {achieved ? (
          <span className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
            <Trophy className="h-3 w-3" />
            Cilj dosežen!
          </span>
        ) : (
          <span className="text-muted-foreground">
            Še <strong className="text-foreground">{formatEUR(data.remaining)}</strong> do cilja
          </span>
        )}
        {hot && !achieved && (
          <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
            <Flame className="h-3 w-3" />
            Blizu!
          </span>
        )}
      </div>
    </Card>
  );
}

export function RevenueGoalTracker() {
  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/revenue-goals")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-amber-600" />
        <h3 className="text-sm font-semibold">Cilji prometa</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GoalCard
          label="Danes"
          icon={Calendar}
          data={data.progress.daily}
          color="amber"
        />
        <GoalCard
          label="Ta teden"
          icon={TrendingUp}
          data={data.progress.weekly}
          color="sky"
        />
        <GoalCard
          label="Ta mesec"
          icon={Target}
          data={data.progress.monthly}
          color="violet"
        />
      </div>
    </div>
  );
}
