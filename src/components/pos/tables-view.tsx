"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { usePosStore } from "@/stores/pos-store";
import { formatEUR, formatTime, type Table, type Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type TableWithOrders = Table & {
  orders: (Order & { items: { id: string }[] })[];
};

export function TablesView() {
  const { data, loading, error, refetch } = useFetch<TableWithOrders[]>("/api/tables");
  const selectTable = usePosStore((s) => s.selectTable);
  const [section, setSection] = useState<string>("Vse");

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Napaka pri nalaganju miz: {error}
        </p>
        <button
          onClick={refetch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Poskusi znova
        </button>
      </div>
    );
  }

  const tables = data || [];
  const sections = ["Vse", ...Array.from(new Set(tables.map((t) => t.section)))];
  const filtered =
    section === "Vse" ? tables : tables.filter((t) => t.section === section);

  const openCount = tables.filter((t) =>
    t.orders.some((o) => o.status === "open")
  ).length;

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Skupaj miz" value={String(tables.length)} accent="neutral" />
        <StatCard label="Zasedene" value={String(openCount)} accent="amber" />
        <StatCard label="Proste" value={String(tables.length - openCount)} accent="emerald" />
        <StatCard label="Sekcije" value={String(sections.length - 1)} accent="neutral" />
      </div>

      {/* Section filter */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              section === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Tables grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          V tej sekciji ni miz.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((t) => {
            const openOrder = t.orders.find((o) => o.status === "open");
            const occupied = !!openOrder;
            const itemsCount = openOrder?.items.length || 0;
            return (
              <Card
                key={t.id}
                onClick={() => selectTable(t.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectTable(t.id);
                  }
                }}
                className={cn(
                  "group relative cursor-pointer overflow-hidden p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  occupied
                    ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-green-950/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t.section}
                    </p>
                    <h3 className="mt-0.5 text-lg font-bold text-foreground">
                      {t.name}
                    </h3>
                  </div>
                  <span
                    className={cn(
                      "flex h-2.5 w-2.5 rounded-full",
                      occupied
                        ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.2)]"
                        : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                    )}
                  />
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{t.seats} oseb</span>
                </div>

                {occupied ? (
                  <div className="mt-3 space-y-1.5">
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    >
                      <Receipt className="h-3 w-3" />
                      {itemsCount} postavk
                    </Badge>
                    {openOrder && (
                      <p className="text-xs text-muted-foreground">
                        Od {formatTime(openOrder.createdAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Prosta
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Kliknite mizo za odprtje naročila
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "neutral" | "amber" | "emerald";
}) {
  return (
    <Card
      className={cn(
        "p-3",
        accent === "amber" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
        accent === "emerald" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          accent === "amber" && "text-amber-700 dark:text-amber-400",
          accent === "emerald" && "text-emerald-700 dark:text-emerald-400",
          accent === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
    </Card>
  );
}
