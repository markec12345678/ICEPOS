"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Star, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VirtualizedMenuListProps {
  items: MenuItem[];
  onItemClick: (item: MenuItem) => void;
  happyHourMap?: Map<string, { discountedPrice: number; discountAmount: number; hasDiscount: boolean }>;
  /** Višina ene kartice v px (default 88) */
  itemHeight?: number;
  /** Buffer število elementov zunaj vidnega območja (default 5) */
  overscan?: number;
  /** Max število prikazanih elementov (default 100) */
  maxItems?: number;
  /** ClassName za container */
  className?: string;
}

/**
 * Virtualiziran seznam menu items.
 * Namesto renderiranja 500+ elementov, renderira samo tiste ki so vidni (+ buffer).
 *
 * Performance: O(visible) namesto O(all)
 */
export function VirtualizedMenuList({
  items,
  onItemClick,
  happyHourMap,
  itemHeight = 88,
  overscan = 5,
  maxItems = 100,
  className,
}: VirtualizedMenuListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Omeji število elementov
  const displayItems = useMemo(() => items.slice(0, maxItems), [items, maxItems]);
  const totalHeight = displayItems.length * itemHeight;

  // Izračunaj vidne elemente
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const endIndex = Math.min(displayItems.length, startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      visibleItems: displayItems.slice(startIndex, endIndex),
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, displayItems]);

  // Observer za container height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);

    return () => observer.disconnect();
  }, []);

  // Scroll handler z throttle
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-y-auto", className)}
      style={{ position: "relative" }}
    >
      {/* Spacer za celotno višino (scrollbar) */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* Render samo vidnih elementov */}
        <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
          {visibleItems.map((item, i) => {
            const realIndex = startIndex + i;
            const hh = happyHourMap?.get(item.id);
            const hasDiscount = hh?.hasDiscount;

            return (
              <div
                key={item.id}
                data-index={realIndex}
                style={{ height: itemHeight }}
                className="border-b border-border/40"
              >
                <button
                  onClick={() => onItemClick(item)}
                  className={cn(
                    "flex h-full w-full items-center gap-3 px-3 py-2 text-left transition-all hover:bg-amber-50/50 active:scale-[0.98] dark:hover:bg-amber-950/10",
                    !item.available && "opacity-40"
                  )}
                  disabled={!item.available}
                >
                  {/* Slika */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                      {item.isFavorite ? "⭐" : "🍽️"}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      {item.isFavorite && (
                        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      {item.isDailySpecial && (
                        <Badge className="shrink-0 bg-rose-500 px-1 text-[9px] text-white">DANA</Badge>
                      )}
                    </div>
                    {item.desc && (
                      <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
                    )}
                  </div>

                  {/* Cena */}
                  <div className="shrink-0 text-right">
                    {hasDiscount && (
                      <p className="text-[10px] text-muted-foreground line-through">
                        {new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(item.price)}
                      </p>
                    )}
                    <p className={cn(
                      "text-sm font-bold",
                      hasDiscount ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                    )}>
                      {new Intl.NumberFormat("sl-SI", { style: "currency", currency: "EUR" }).format(
                        hasDiscount ? hh!.discountedPrice : item.price
                      )}
                    </p>
                    {hasDiscount && (
                      <Badge className="bg-rose-500 px-1 text-[9px] text-white">
                        -{Math.round((hh!.discountAmount / item.price) * 100)}%
                      </Badge>
                    )}
                  </div>

                  {/* Add icon */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    <Plus className="h-4 w-4" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info o omejitvi */}
      {items.length > maxItems && (
        <div className="border-t border-border/40 bg-muted/20 px-3 py-1.5 text-center text-[10px] text-muted-foreground">
          Prikazano prvih {maxItems} od {items.length} rezultatov — napiši bolj specifično iskanje
        </div>
      )}
    </div>
  );
}
