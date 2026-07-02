"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Cake, Zap, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/components/pos/pin-login";
import { toast } from "sonner";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

/**
 * Konfiguracija zastavic naročil.
 * Vsaka zastavica ima: ikono, oznako (sl), barvo in opis.
 */
export const ORDER_FLAGS = [
  { id: "vip", label: "VIP", icon: Crown, color: "amber", desc: "Pomembna stranka" },
  { id: "birthday", label: "Rojs. dan", icon: Cake, color: "rose", desc: "Proslavlja rojstni dan" },
  { id: "rush", label: "NUJNO", icon: Zap, color: "orange", desc: "Hitra priprava" },
  { id: "allergy", label: "Alergija", icon: ShieldAlert, color: "red", desc: "Alergija na hrano" },
] as const;

const FLAG_COLOR_CLASSES: Record<string, {
  active: string;
  inactive: string;
  badge: string;
}> = {
  amber: {
    active: "bg-amber-500 text-white border-amber-600",
    inactive: "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30",
    badge: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  },
  rose: {
    active: "bg-rose-500 text-white border-rose-600",
    inactive: "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30",
    badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800",
  },
  orange: {
    active: "bg-orange-500 text-white border-orange-600",
    inactive: "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30",
    badge: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
  },
  red: {
    active: "bg-red-500 text-white border-red-600",
    inactive: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30",
    badge: "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
  },
};

/**
 * Prikaze zastavice naročila kot male badge-e (samo za prikaz, brez upravljanja).
 */
export function OrderFlagsDisplay({ flags }: { flags: string[] | null }) {
  if (!flags || flags.length === 0) return null;

  let flagArray: string[] = [];
  try {
    const parsed = typeof flags === "string" ? JSON.parse(flags) : flags;
    if (Array.isArray(parsed)) flagArray = parsed;
  } catch {
    return null;
  }

  if (flagArray.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {flagArray.map((flagId) => {
        const config = ORDER_FLAGS.find((f) => f.id === flagId);
        if (!config) return null;
        const Icon = config.icon;
        const colors = FLAG_COLOR_CLASSES[config.color];
        return (
          <span
            key={flagId}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              colors.badge
            )}
            title={config.desc}
          >
            <Icon className="h-2.5 w-2.5" />
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

/**
 * OrderFlagsManager — upravljanje zastavic za aktivno naročilo.
 * Prikaze gumbe za preklop vsake zastavice.
 */
export function OrderFlagsManager({
  orderId,
  initialFlags,
  onFlagsChange,
}: {
  orderId: string | null;
  initialFlags?: string[];
  onFlagsChange?: (flags: string[]) => void;
}) {
  const [flags, setFlags] = useState<string[]>(initialFlags || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialFlags) {
      setFlags(initialFlags);
    } else if (orderId) {
      // Naloži zastavice iz API-ja
      fetch(`/api/orders/${orderId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.flags) {
            try {
              const parsed = JSON.parse(d.flags);
              if (Array.isArray(parsed)) setFlags(parsed);
            } catch {
              // ignore
            }
          }
        })
        .catch(() => {});
    } else {
      setFlags([]);
    }
  }, [orderId, initialFlags]);

  async function toggleFlag(flagId: string) {
    const newFlags = flags.includes(flagId)
      ? flags.filter((f) => f !== flagId)
      : [...flags, flagId];

    setFlags(newFlags);
    onFlagsChange?.(newFlags);

    // Shrani na server (če imamo orderId)
    if (orderId) {
      setSaving(true);
      try {
        const res = await fetch(`/api/orders/${orderId}/flags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ flags: newFlags }),
        });
        if (!res.ok) throw new Error("Napaka");
        playFeedbackSound("info");
        const config = ORDER_FLAGS.find((f) => f.id === flagId);
        if (config) {
          toast.success(
            newFlags.includes(flagId)
              ? `${config.label} dodan`
              : `${config.label} odstranjen`,
            { duration: 1500 }
          );
        }
      } catch {
        toast.error("Napaka pri shranjevanju oznak");
        // Vrni na prejšnje stanje
        setFlags(flags);
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {ORDER_FLAGS.map((flag) => {
        const Icon = flag.icon;
        const isActive = flags.includes(flag.id);
        const colors = FLAG_COLOR_CLASSES[flag.color];
        return (
          <Button
            key={flag.id}
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => toggleFlag(flag.id)}
            className={cn(
              "h-7 gap-1 px-2 text-xs transition-all",
              isActive
                ? cn("border-2", colors.active)
                : colors.inactive
            )}
            title={flag.desc}
          >
            <Icon className="h-3 w-3" />
            {flag.label}
            {isActive && <X className="h-2.5 w-2.5 opacity-70" />}
          </Button>
        );
      })}
    </div>
  );
}
