"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Animiran badge prihodka danes z count-up animacijo.
 * Ko se vrednost spremeni, številka se gladko animira od stare do nove vrednosti.
 */
export function AnimatedRevenueBadge({ revenue }: { revenue: number }) {
  const animatedValue = useCountUp(revenue, 1000);

  if (revenue <= 0) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
        "tabular-nums"
      )}
      title="Prihodek danes (auto-refresh)"
    >
      <TrendingUp className="h-3.5 w-3.5" />
      {formatEUR(Math.round(animatedValue * 100) / 100)}
    </Badge>
  );
}
