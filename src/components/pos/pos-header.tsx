"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Clock, ShieldCheck, Wifi, WifiOff, UserCircle, LogOut, Keyboard, Search, PanelLeftClose, PanelLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LangToggle } from "@/components/lang-toggle";
import { CurrencyToggle } from "@/components/currency-toggle";
import { SoundToggle } from "@/components/sound-toggle";
import { AnimatedRevenueBadge } from "@/components/animated-revenue-badge";
import { TenantSelector } from "@/components/pos/tenant-selector";
import { NotificationCenter } from "@/components/notification-center";
import { useFetch } from "@/hooks/use-fetch";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { usePosStore } from "@/stores/pos-store";
import {
  getStoredOperator,
  clearStoredOperator,
  type Operator,
} from "@/components/pos/pin-login";
import { useTenantStore } from "@/stores/tenant-store";
import { toast } from "sonner";
import { type DashboardStats } from "@/lib/types";

export function PosHeader() {
  const [now, setNow] = useState(new Date());
  const [operator, setOperator] = useState<Operator | null>(null);
  const currentTenant = useTenantStore((s) => s.current);
  const { data: stats } = useFetch<DashboardStats>("/api/stats");
  const isOnline = useOnlineStatus();
  const sidebarCollapsed = usePosStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = usePosStore((s) => s.setSidebarCollapsed);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lazy initial state — prebere localStorage enkrat
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
    setOperator(getStoredOperator());
  }, []);

  // Poslušaj spremembe operatorja (login/logout)
  useEffect(() => {
    function handler() {
      setOperator(getStoredOperator());
    }
    window.addEventListener("storage", handler);
    window.addEventListener("operator-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("operator-changed", handler);
    };
  });

  function logout() {
    clearStoredOperator();
    setOperator(null);
    window.dispatchEvent(new Event("operator-changed"));
    toast.info("Odjava uspešna");
  }

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
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 shrink-0 md:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Razširi stransko vrstico" : "Skrči stransko vrstico"}
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold leading-tight text-foreground md:text-lg">
              {currentTenant?.name || "Gostilna Pri Marku"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Restavracija &middot; Pivnica &middot; Sobiše
            </p>
          </div>
          <TenantSelector />
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {stats && <AnimatedRevenueBadge revenue={stats.todayRevenue} />}
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            SRS aktivna
          </Badge>
          {isOnline ? (
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              title="Naprava je povezana z internetom"
            >
              <Wifi className="h-3.5 w-3.5" />
              Online
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1.5 border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              title="Brez povezave — fiskalizacija bo čakala v vrsti"
            >
              <WifiOff className="h-3.5 w-3.5 animate-pulse" />
              Offline
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </Badge>
          {loaded && operator && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
              onClick={logout}
              title="Odjava"
            >
              <UserCircle className="h-4 w-4" />
              {operator.name}
              <LogOut className="h-3 w-3 opacity-60" />
            </Button>
          )}
          <LangToggle />
          <CurrencyToggle />
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 gap-1.5 px-2 md:flex"
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            title="Iskanje (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="rounded border bg-muted px-1 text-[10px] font-mono">⌘K</kbd>
          </Button>
          <NotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 md:flex"
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "?", bubbles: true });
              window.dispatchEvent(event);
            }}
            title="Tipkovne bližnjice (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <SoundToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {time}
          </Badge>
          {loaded && operator && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={logout}
            >
              <UserCircle className="h-4 w-4" />
              {operator.name}
            </Button>
          )}
          <CurrencyToggle />
          <LangToggle />
          <ThemeToggle />
          <SoundToggle />
        </div>
      </div>
      <div className="border-t border-border/60 bg-muted/30 px-4 py-1.5 md:px-6">
        <p className="text-xs capitalize text-muted-foreground">{date}</p>
      </div>
    </header>
  );
}
