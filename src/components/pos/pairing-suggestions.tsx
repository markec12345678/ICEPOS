"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, TrendingUp, Sparkles } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PairData {
  topPairs: {
    items: { id: string; name: string; category: string; price: number; imageUrl: string | null }[];
    count: number;
    combinedPrice: number;
  }[];
  totalOrders: number;
}

export function PairingSuggestions() {
  const [data, setData] = useState<PairData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/menu/pairing-suggestions")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.topPairs.length === 0) {
    return null;
  }

  const maxCount = Math.max(...data.topPairs.map((p) => p.count), 1);

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-violet-500" />
          AI predlogi parjenja jedi
          <Badge variant="secondary" className="text-[10px] gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            Market Basket
          </Badge>
        </h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          Najpogostejše kombinacije jedi na istem računu — uporabi za upsell in combo menije
        </p>
      </div>

      <div className="divide-y">
        {data.topPairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            {/* Rank */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
              {i + 1}
            </span>

            {/* Items */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {/* Item 1 */}
                <div className="flex items-center gap-1.5">
                  {pair.items[0].imageUrl && (
                    <img src={pair.items[0].imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{pair.items[0].name}</p>
                    <p className="text-[9px] text-muted-foreground">{formatEUR(pair.items[0].price)}</p>
                  </div>
                </div>

                {/* Link icon */}
                <Link2 className="h-3 w-3 shrink-0 text-muted-foreground" />

                {/* Item 2 */}
                <div className="flex items-center gap-1.5">
                  {pair.items[1].imageUrl && (
                    <img src={pair.items[1].imageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{pair.items[1].name}</p>
                    <p className="text-[9px] text-muted-foreground">{formatEUR(pair.items[1].price)}</p>
                  </div>
                </div>
              </div>

              {/* Frequency bar */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                  style={{ width: `${(pair.count / maxCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="shrink-0 text-right">
              <div className="flex items-center justify-end gap-0.5">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-sm font-bold tabular-nums">{pair.count}×</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                skupaj {formatEUR(pair.combinedPrice)}
              </p>
              <p className="text-[9px] text-violet-600 dark:text-violet-400">
                {data.totalOrders > 0 ? Math.round((pair.count / data.totalOrders) * 100) : 0}% računov
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="border-t bg-muted/30 p-2 text-center text-[10px] text-muted-foreground">
        💡 Uporabi te kombinacije za combo menije in upsell predloge v POS
      </div>
    </Card>
  );
}
