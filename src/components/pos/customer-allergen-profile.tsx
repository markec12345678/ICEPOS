"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, X, Plus } from "lucide-react";
import { ALLERGEN_INFO, ALLERGEN_KEYS } from "@/lib/allergens";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CustomerAllergenProfile({ customerId }: { customerId: string }) {
  const [allergens, setAllergens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${customerId}/allergens`)
      .then((r) => r.json())
      .then((d) => {
        if (d.allergens) setAllergens(d.allergens);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  async function toggleAllergen(key: string) {
    const newAllergens = allergens.includes(key)
      ? allergens.filter((a) => a !== key)
      : [...allergens, key];

    setAllergens(newAllergens);
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/allergens`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allergens: newAllergens }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success(
        newAllergens.includes(key) ? "Alergen dodan" : "Alergen odstranjen",
        { duration: 1500 }
      );
    } catch {
      toast.error("Napaka pri shranjevanju");
      setAllergens(allergens);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-20" />;
  }

  return (
    <Card className={cn(
      "p-3",
      allergens.length > 0 && "border-rose-300 bg-rose-50/30 dark:border-rose-800 dark:bg-rose-950/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn("h-4 w-4", allergens.length > 0 ? "text-rose-500" : "text-muted-foreground")} />
          <p className="text-sm font-semibold">Alergeni stranke</p>
          {allergens.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {allergens.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Skrij" : "Uredi"}
        </Button>
      </div>

      {/* Prikaz alergenov */}
      {allergens.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Ni znanih alergenov. Klikni "Uredi" za dodajanje.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1">
          {allergens.map((key) => {
            const info = ALLERGEN_INFO[key];
            if (!info) return null;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
              >
                {info.icon} {info.sl}
                {editing && (
                  <button
                    onClick={() => toggleAllergen(key)}
                    disabled={saving}
                    className="ml-0.5 hover:text-rose-900 dark:hover:text-rose-300"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Urejanje */}
      {editing && (
        <div className="mt-2 border-t border-border/40 pt-2">
          <p className="mb-1 text-[10px] text-muted-foreground">
            Klikni za dodajanje/odstranjevanje:
          </p>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {ALLERGEN_KEYS.map((key) => {
              const info = ALLERGEN_INFO[key];
              if (!info) return null;
              const active = allergens.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleAllergen(key)}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors",
                    active
                      ? "bg-rose-100 text-rose-700 ring-1 ring-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-800"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {info.icon} {info.sl}
                  {active && <X className="ml-auto h-2.5 w-2.5" />}
                  {!active && <Plus className="ml-auto h-2.5 w-2.5 opacity-50" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
