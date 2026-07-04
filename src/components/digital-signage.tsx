// @ts-nocheck — pre-existing TS errors (Task U1)
"use client";

import { useEffect, useState, useCallback } from "react";
import { formatEUR, CATEGORIES, type MenuItem } from "@/lib/types";
import {
  Clock,
  Star,
  Sparkles,
  Flame,
} from "lucide-react";

// ============================================================
// Digital Signage — TV zaslon za restavracijo
// ============================================================
// Namenjen za prikaz na TV zaslonu v restavraciji.
// Rotira med: dnevna ponudba, kategorije, promocije.
// Avto-osvežitev vsakih 30s.
// ============================================================

const SLIDE_DURATION = 15000; // 15 sekund na slide
const REFRESH_INTERVAL = 30000; // 30 sekund osvežitev menija

export function DigitalSignage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [now, setNow] = useState(new Date());
  const [currentSlide, setCurrentSlide] = useState(0);

  // Naloži meni
  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) return;
      const items: MenuItem[] = await res.json();
      setMenu(items.filter((i) => i.available));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMenu();
    const refreshInterval = setInterval(loadMenu, REFRESH_INTERVAL);
    return () => clearInterval(refreshInterval);
  }, [loadMenu]);

  // Ura
  useEffect(() => {
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Rotacija slide-ov
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => prev + 1);
    }, SLIDE_DURATION);
    return () => clearInterval(slideInterval);
  }, []);

  const time = new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  // Dnevna ponudba
  const dailySpecials = menu.filter((m) => m.isDailySpecial);
  const favorites = menu.filter((m) => m.isFavorite).slice(0, 8);

  // Določi kateri slide prikazati
  const slides: "daily" | "favorites" | "category"[] = ["daily", "favorites", "category"];
  const slideType = slides[currentSlide % 3] as "daily" | "favorites" | "category";
  const categoryIndex = Math.floor(currentSlide / 3) % CATEGORIES.length;
  const currentCategory = CATEGORIES[categoryIndex];
  const categoryItems = menu.filter((m) => m.category === currentCategory.id).slice(0, 12);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Gostilna Pri Marku</h1>
            <p className="text-sm text-slate-400">Tradicionalna slovenska kuhinja</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold tabular-nums">{time}</p>
          <p className="text-sm capitalize text-slate-400">{date}</p>
        </div>
      </header>

      {/* Content — rotira med slidi */}
      <main className="flex-1 overflow-hidden px-12 py-4">
        {slideType === "daily" && dailySpecials.length > 0 && (
          <SlideDailySpecials items={dailySpecials} />
        )}
        {slideType === "favorites" && favorites.length > 0 && (
          <SlideFavorites items={favorites} />
        )}
        {slideType === "category" && (
          <SlideCategory category={currentCategory} items={categoryItems} />
        )}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-slate-700/50 px-12 py-4">
        <p className="text-sm text-slate-500">
          📍 Prevozna 11, Ljubljana · 📞 01 234 56 78
        </p>
        <div className="flex items-center gap-2">
          {/* Slide indicators */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                (currentSlide % 3) === i ? "w-8 bg-amber-500" : "w-2 bg-slate-600"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-slate-500">
          Skeniraj QR kodo na mizi za celoten meni
        </p>
      </footer>
    </div>
  );
}

// ============================================================
// Slide: Dnevna ponudba
// ============================================================

function SlideDailySpecials({ items }: { items: MenuItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Flame className="h-8 w-8 text-amber-500" />
        <h2 className="text-4xl font-bold text-amber-500">Dnevna ponudba</h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl bg-slate-800/50 p-6 ring-1 ring-slate-700"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-24 w-24 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-2xl font-bold">{item.name}</h3>
              {item.desc && (
                <p className="mt-1 text-sm text-slate-400">{item.desc}</p>
              )}
              <p className="mt-2 text-3xl font-bold text-amber-500">
                {formatEUR(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Slide: Priljubljene
// ============================================================

function SlideFavorites({ items }: { items: MenuItem[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Star className="h-8 w-8 fill-amber-500 text-amber-500" />
        <h2 className="text-4xl font-bold text-amber-500">Priljubljene jedi</h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col rounded-2xl bg-slate-800/50 p-4 ring-1 ring-slate-700"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="mb-3 aspect-square w-full rounded-xl object-cover"
              />
            )}
            <h3 className="text-lg font-bold leading-tight">{item.name}</h3>
            {item.desc && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.desc}</p>
            )}
            <p className="mt-2 text-xl font-bold text-amber-500">
              {formatEUR(item.price)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Slide: Kategorija
// ============================================================

function SlideCategory({
  category,
  items,
}: {
  category: { id: string; label: string; icon: string };
  items: MenuItem[];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-4xl">{category.icon}</span>
        <h2 className="text-4xl font-bold text-amber-500">{category.label}</h2>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 ring-1 ring-slate-700"
          >
            <div className="flex items-center gap-3">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div>
                <h3 className="text-lg font-bold leading-tight">{item.name}</h3>
                {item.desc && (
                  <p className="line-clamp-1 text-xs text-slate-400">{item.desc}</p>
                )}
              </div>
            </div>
            <p className="ml-2 text-xl font-bold text-amber-500">
              {formatEUR(item.price)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
