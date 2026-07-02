"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Clock, MapPin } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SectionData {
  sections: {
    section: string;
    tableCount: number;
    totalSeats: number;
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    avgOrderValue: number;
    avgTurnTime: number;
    revenuePerSeat: number;
    ordersPerTable: number;
    tables: { name: string; number: number; seats: number; orders: number; revenue: number }[];
  }[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalSeats: number;
    totalTables: number;
    avgOrderValue: number;
    revenuePerSeat: number;
  };
  days: number;
}

const SECTION_ICONS: Record<string, string> = {
  Dvorana: "🏛️",
  Terasa: "🌿",
  Zasebna: "🔒",
  Bar: "🍸",
};

export function SectionStats() {
  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tables/section-stats?days=30")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.sections.length === 0) {
    return null;
  }

  const maxRevenue = Math.max(...data.sections.map((s) => s.totalRevenue), 1);

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-amber-600" />
          Analitika po sekcijah miz
          <Badge variant="secondary" className="text-[10px]">
            zadnjih {data.days} dni
          </Badge>
        </h3>
      </div>

      {/* Skupne metrike */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Skupni promet
          </div>
          <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatEUR(data.summary.totalRevenue)}
          </p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            Skupno sedišč
          </div>
          <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {data.summary.totalSeats}
          </p>
        </div>
        <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Skupaj miz
          </div>
          <p className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">
            {data.summary.totalTables}
          </p>
        </div>
        <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-950/20">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            Promet/sedišče
          </div>
          <p className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">
            {formatEUR(data.summary.revenuePerSeat)}
          </p>
        </div>
      </div>

      {/* Sekcije */}
      <div className="space-y-2 p-4 pt-0">
        {data.sections.map((section) => {
          const isExpanded = expandedSection === section.section;
          const icon = SECTION_ICONS[section.section] || "🍽️";
          return (
            <div
              key={section.section}
              className="overflow-hidden rounded-lg border border-border/60"
            >
              {/* Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.section)}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/30"
              >
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{section.section}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {section.tableCount} miz · {section.totalSeats} sedišč
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {section.totalOrders} računov · {formatEUR(section.avgOrderValue)} povp. · {section.avgTurnTime}m turn time
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">{formatEUR(section.totalRevenue)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatEUR(section.revenuePerSeat)}/sedišče
                  </p>
                </div>
              </button>

              {/* Bar chart */}
              <div className="px-3 pb-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                    style={{ width: `${(section.totalRevenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>

              {/* Expanded: mize v sekciji */}
              {isExpanded && (
                <div className="border-t border-border/40 bg-muted/20 p-2">
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Mize v sekciji (top po prometu)
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {section.tables.slice(0, 10).map((table) => (
                      <div
                        key={table.name}
                        className="flex items-center justify-between gap-2 rounded-md bg-background/50 p-1.5 text-xs"
                      >
                        <span className="truncate font-medium">#{table.number} {table.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {table.orders}× · {table.seats} sed.
                          </span>
                          <span className="font-semibold tabular-nums">{formatEUR(table.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {section.tables.length > 10 && (
                    <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                      + {section.tables.length - 10} več miz
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
