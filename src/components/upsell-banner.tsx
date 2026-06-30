"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles } from "lucide-react";
import { formatEUR, type MenuItem } from "@/lib/types";
import type { UpsellSuggestion } from "@/lib/upsell";

export function UpsellBanner({
  suggestions,
  onAdd,
}: {
  suggestions: UpsellSuggestion[];
  onAdd: (item: MenuItem) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-3 dark:border-purple-800 dark:bg-purple-950/20">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
          Priporočamo še
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.item.id}
            onClick={() => onAdd(s.item)}
            className="flex items-center gap-2 rounded-lg border-2 border-purple-200 bg-card p-2 transition-all hover:border-purple-400 hover:shadow-sm dark:border-purple-800"
          >
            {s.item.imageUrl && (
              <img
                src={s.item.imageUrl}
                alt={s.item.name}
                className="h-10 w-10 rounded object-cover"
              />
            )}
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm">{s.icon}</span>
                <p className="text-xs font-medium">{s.item.name}</p>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">{s.reason}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                {formatEUR(s.item.price)}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white">
                <Plus className="h-3 w-3" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
