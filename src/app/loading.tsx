import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

/**
 * Next.js loading state — prikaže se med nalaganjem strani/rute.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header skeleton */}
      <div className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1 h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden w-60 shrink-0 border-r border-border bg-card p-3 md:block">
          <Skeleton className="mb-3 h-4 w-16" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10 w-full rounded-lg" />
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* KPI skeleton */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>

            {/* Chart skeleton */}
            <Skeleton className="h-64 rounded-xl" />

            {/* List skeleton */}
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-card px-3 py-2 shadow-lg border border-border">
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
        <span className="text-xs font-medium text-muted-foreground">Nalagam...</span>
      </div>
    </div>
  );
}
