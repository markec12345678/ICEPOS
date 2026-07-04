"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// REUSABLE SKELETON PATTERNS
// ============================================================

/** Skeleton za KPI kartice (grid) */
export function KpiSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="mt-2 h-7 w-16" />
          <Skeleton className="mt-1 h-3 w-12" />
        </Card>
      ))}
    </div>
  );
}

/** Skeleton za tabelo */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b bg-muted/30 p-3">
        <div className="flex gap-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-2 p-3">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" style={{ width: `${Math.random() * 40 + 60}%` }} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Skeleton za list/seznam kartic */
export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </Card>
      ))}
    </div>
  );
}

/** Skeleton za chart/graf */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex h-48 items-end gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </Card>
  );
}

/** Skeleton za dashboard (kombinacija vsega) */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <KpiSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ListSkeleton count={4} />
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}

/** Skeleton za grid kartic (npr. mize, meni postavke) */
export function GridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-20" />
          <Skeleton className="mt-1 h-3 w-16" />
          <Skeleton className="mt-2 h-6 w-12" />
        </Card>
      ))}
    </div>
  );
}

/** Skeleton za detail dialog */
export function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}

// ============================================================
// ERROR STATE
// ============================================================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Napaka pri nalaganju",
  description = "Prišlo je do napake. Poskusite znova.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
        <AlertCircle className="h-7 w-7 text-rose-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Poskusi znova
        </Button>
      )}
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "Ni podatkov",
  description = "Tukaj še ni ničesar.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================================
// LOADING STATE (spinner)
// ============================================================

export function LoadingSpinner({ label = "Nalagam...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
