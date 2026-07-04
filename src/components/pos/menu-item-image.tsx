"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { UtensilsCrossed } from "lucide-react";

interface MenuItemImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  category?: string;
}

// Emoji map za kategorije (fallback)
const CATEGORY_EMOJI: Record<string, string> = {
  glavne_jedi: "🍽️",
  predjedi: "🥗",
  sladice: "🍰",
  pice: "🍷",
  toplive_pijace: "☕",
  hladne_pijace: "🥤",
  alkoholne_pijace: "🍺",
  brezalkoholne_pijace: "🧃",
  juhe: "🍲",
  solate: "🥬",
  priloge: "🍟",
  otroci: "🧸",
};

/**
 * Slika meni postavke z inteligentnim fallback-om:
 * 1. Prikaz slike če obstaja
 * 2. Emoji fallback glede na kategorijo
 * 3. Ikona fallback (UtensilsCrossed)
 */
export function MenuItemImage({ src, alt, className, category }: MenuItemImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    setLoading(true);
  }, [src]);

  // Če ni slike ali je napaka → fallback
  if (!src || error) {
    const emoji = category ? CATEGORY_EMOJI[category] : null;
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30",
          className
        )}
      >
        {emoji ? (
          <span className="text-3xl opacity-50">{emoji}</span>
        ) : (
          <UtensilsCrossed className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-muted/50" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          "h-full w-full object-cover transition-opacity",
          loading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
    </div>
  );
}
