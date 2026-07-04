"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Settings2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STORAGE_KEY = "icepos_dashboard_widgets";

export interface WidgetConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "revenueGoals", label: "Cilji prometa", icon: "🎯", visible: true },
  { id: "hourlyTargets", label: "Urni cilji", icon: "⏰", visible: true },
  { id: "utilizationGauge", label: "Zasedenost miz", icon: "📊", visible: true },
  { id: "kpiCards", label: "KPI kartice", icon: "📈", visible: true },
  { id: "hourlyChart", label: "Urni graf prometa", icon: "📉", visible: true },
  { id: "topItems", label: "Top izdelki", icon: "🏆", visible: true },
  { id: "paymentMethods", label: "Načini plačila", icon: "💳", visible: true },
  { id: "activeOrders", label: "Aktivna naročila", icon: "📋", visible: true },
  { id: "orderFlow", label: "Tok naročil", icon: "🔄", visible: true },
  { id: "weeklyComparison", label: "Tedenska primerjava", icon: "📅", visible: true },
  { id: "revenueForecast", label: "Napoved prometa", icon: "🧠", visible: true },
  { id: "activityFeed", label: "Aktivnosti", icon: "🔔", visible: true },
  { id: "liveServers", label: "Aktivni natakarji", icon: "👨‍🍳", visible: true },
  { id: "birthdays", label: "Rojstni dnevi", icon: "🎂", visible: true },
  { id: "turnTime", label: "Turn time analitika", icon: "⏱️", visible: true },
  { id: "sectionStats", label: "Sekcije miz", icon: "🏛️", visible: true },
  { id: "heatmap", label: "Heatmap prometa", icon: "🔥", visible: true },
];

function loadConfig(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const saved = JSON.parse(raw) as WidgetConfig[];
    // Merge z defaults (za nove widgete)
    return DEFAULT_WIDGETS.map((def) => {
      const found = saved.find((s) => s.id === def.id);
      return found ? { ...def, visible: found.visible } : def;
    });
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveConfig(config: WidgetConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useWidgetVisibility() {
  const [config, setConfig] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadConfig());
  }, []);

  const isVisible = (id: string): boolean => {
    const widget = config.find((w) => w.id === id);
    return widget ? widget.visible : true;
  };

  const toggle = (id: string): void => {
    setConfig((prev) => {
      const next = prev.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
      saveConfig(next);
      return next;
    });
  };

  const reset = (): void => {
    setConfig(DEFAULT_WIDGETS);
    saveConfig(DEFAULT_WIDGETS);
    toast.success("Dashboard ponastavljen na privzete nastavitve");
  };

  const visibleCount = config.filter((w) => w.visible).length;
  const hiddenCount = config.length - visibleCount;

  return { config, isVisible, toggle, reset, visibleCount, hiddenCount };
}

export function DashboardCustomizer() {
  const { config, toggle, reset, visibleCount, hiddenCount } = useWidgetVisibility();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          title="Prilagodi dashboard"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prilagodi</span>
          {hiddenCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[9px]">
              {hiddenCount} skritih
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Dashboard widgeti</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={reset}
              title="Ponastavi na privzeto"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Prikazano: <strong>{visibleCount}</strong> / {config.length} widgetov
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {config.map((widget) => (
              <button
                key={widget.id}
                onClick={() => toggle(widget.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border p-2 text-left transition-colors",
                  widget.visible
                    ? "border-border hover:bg-muted/50"
                    : "border-border/40 bg-muted/20 opacity-60"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{widget.icon}</span>
                  <span className="text-xs font-medium">{widget.label}</span>
                </div>
                {widget.visible ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
