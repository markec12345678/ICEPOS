"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Cake, Phone, Mail, Star } from "lucide-react";
import { formatEUR } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BirthdayData {
  birthdays: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    birthday: string;
    nextBirthday: string;
    daysUntil: number;
    age: number;
    isToday: boolean;
    isTomorrow: boolean;
    totalSpent: number;
    visitCount: number;
    points: number;
  }[];
  summary: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sl-SI", {
    day: "numeric",
    month: "long",
  });
}

export function BirthdayReminders() {
  const [data, setData] = useState<BirthdayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers/birthdays?days=30")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data || data.birthdays.length === 0) {
    return null;
  }

  const { summary } = data;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-rose-500/10 to-pink-500/10 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Cake className="h-4 w-4 text-rose-500" />
          Rojstni dnevi strank
          {summary.today > 0 && (
            <Badge variant="destructive" className="animate-pulse text-[10px]">
              {summary.today} DANES!
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Teden: <strong className="text-foreground">{summary.thisWeek}</strong></span>
          <span>Mesec: <strong className="text-foreground">{summary.thisMonth}</strong></span>
        </div>
      </div>

      <div className="max-h-64 divide-y overflow-y-auto">
        {data.birthdays.slice(0, 10).map((b) => (
          <div
            key={b.id}
            className={cn(
              "flex items-center gap-3 p-3 transition-colors hover:bg-muted/30",
              b.isToday && "bg-rose-50 dark:bg-rose-950/20"
            )}
          >
            {/* Avatar z ikono */}
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
              b.isToday
                ? "bg-rose-500 text-white animate-pulse"
                : b.isTomorrow
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            )}>
              <Cake className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{b.name}</p>
                {b.isToday && (
                  <Badge variant="destructive" className="text-[9px]">DANES</Badge>
                )}
                {b.isTomorrow && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-[9px]">
                    JUTRI
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  🎂 {formatDate(b.nextBirthday)}
                  {b.age > 0 && ` (${b.age} let)`}
                </span>
                {b.daysUntil > 0 && (
                  <span>· čez {b.daysUntil} {b.daysUntil === 1 ? "dan" : b.daysUntil < 5 ? "dni" : "dni"}</span>
                )}
                <span>· {b.visitCount} obiskov</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Kontakt */}
              {b.phone && (
                <a
                  href={`tel:${b.phone}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={`Klic: ${b.phone}`}
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
              )}
              {b.email && (
                <a
                  href={`mailto:${b.email}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title={`Email: ${b.email}`}
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              )}
              {/* VIP badge za dobre stranke */}
              {b.totalSpent >= 200 && (
                <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400 text-[9px]">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  VIP
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.birthdays.length > 10 && (
        <div className="border-t bg-muted/30 p-2 text-center text-[10px] text-muted-foreground">
          + {data.birthdays.length - 10} več v mesecu
        </div>
      )}
    </Card>
  );
}
