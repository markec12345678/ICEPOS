"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Store, Clock, ShieldCheck, Wifi } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function PosHeader() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  const date = new Intl.DateTimeFormat("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground md:text-lg">
              Gostilna Pri Marku
            </h1>
            <p className="text-xs text-muted-foreground">
              Restavracija &middot; Pivnica &middot; Sobiše
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            SRS aktivna
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
          >
            <Wifi className="h-3.5 w-3.5" />
            Online
          </Badge>
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </Badge>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {time}
          </Badge>
          <ThemeToggle />
        </div>
      </div>
      <div className="border-t border-border/60 bg-muted/30 px-4 py-1.5 md:px-6">
        <p className="text-xs capitalize text-muted-foreground">{date}</p>
      </div>
    </header>
  );
}
