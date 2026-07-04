"use client";

import { useFetch } from "@/hooks/use-fetch";
import { ImageManager } from "@/components/pos/image-manager";
import type { MenuItem } from "@/lib/types";
import { Image as ImageIcon } from "lucide-react";
import { LoadingSpinner, ErrorState, KpiSkeleton, TableSkeleton, ListSkeleton } from "@/components/pos/loading-states";

export function ImagesView() {
  const { data: menuItems, refetch } = useFetch<MenuItem[]>("/api/menu");

  if (!menuItems) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ImageIcon className="h-6 w-6 text-purple-600" />
          Slike jedi — AI generator
        </h2>
        <p className="text-sm text-muted-foreground">
          Upravljanje slik za meni postavke — AI generiranje ali ročni upload
        </p>
      </div>
      <ImageManager menuItems={menuItems} onUpdated={refetch} />
    </div>
  );
}
