"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Sparkles,
  Star,
  Plus,
  Search,
  Clock,
  Tag,
  Image as ImageIcon,
  Flame,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface SpecialItem {
  id: string;
  name: string;
  nameEn: string | null;
  category: string;
  price: number;
  discountedPrice: number;
  hasDiscount: boolean;
  activeDiscount: string | null;
  available: boolean;
  desc: string | null;
  imageUrl: string | null;
  calories: number | null;
}

interface HappyHourInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  discountType: string;
  discountValue: number;
}

interface DailySpecialsData {
  date: string;
  dayOfWeek: number;
  activeHappyHours: HappyHourInfo[];
  items: SpecialItem[];
  summary: {
    totalSpecials: number;
    availableSpecials: number;
    discountedItems: number;
  };
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isDailySpecial: boolean;
  available: boolean;
}

const DAY_NAMES = ["Nedelja", "Ponedeljek", "Torek", "Sreda", "Četrtek", "Petek", "Sobota"];
const CATEGORY_LABELS: Record<string, string> = {
  predjedi: "Predjedi",
  glavne_jedi: "Glavne jedi",
  sladice: "Sladice",
  brezalkoholne: "Brezalkoholne",
  alkoholne: "Alkoholne",
};

function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] || c;
}

export function DailySpecialsView() {
  const [data, setData] = useState<DailySpecialsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/daily-specials", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju dnevnih specialitet");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMenuItems = useCallback(async () => {
    try {
      const res = await fetch("/api/menu", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setMenuItems(json);
    } catch {
      toast.error("Napaka pri nalaganju menija");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (addDialogOpen) {
      loadMenuItems();
    }
  }, [addDialogOpen, loadMenuItems]);

  const toggleSpecial = async (menuItemId: string, isDailySpecial: boolean) => {
    setUpdating(menuItemId);
    try {
      const res = await fetch("/api/daily-specials", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ menuItemId, isDailySpecial }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(
        isDailySpecial
          ? "✓ Označeno kot dnevna specialiteta"
          : "✓ Odstranjeno iz dnevnih specialitet"
      );
      // Osveži podatke
      await loadData();
      // Posodobi lokalni menu list
      setMenuItems((prev) =>
        prev.map((m) => (m.id === menuItemId ? { ...m, isDailySpecial } : m))
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri posodabljanju");
    } finally {
      setUpdating(null);
    }
  };

  const filteredSpecials = (data?.items || []).filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredMenuItems = menuItems.filter((item) => {
    if (menuSearch && !item.name.toLowerCase().includes(menuSearch.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dnevne specialitete</h2>
          <p className="text-sm text-muted-foreground">Upravljanje dnevnih specialitet in ponudb</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-6 w-6 text-amber-600" />
            Dnevne specialitete
          </h2>
          <p className="text-sm text-muted-foreground">
            {DAY_NAMES[data.dayOfWeek]}, {data.date} — upravljanje dnevnih ponudb in specialitet
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Uredi specialitete
        </Button>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Skupaj specialitet
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {s.totalSpecials}
              </p>
            </div>
            <Star className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Na voljo
              </p>
              <p className="text-2xl font-bold text-emerald-600">{s.availableSpecials}</p>
            </div>
            <Tag className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                S popustom
              </p>
              <p className="text-2xl font-bold text-rose-600">{s.discountedItems}</p>
            </div>
            <Flame className="h-8 w-8 text-rose-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Aktivni Happy Hour
              </p>
              <p className="text-2xl font-bold">{data.activeHappyHours.length}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Aktivni Happy Hour-ji */}
      {data.activeHappyHours.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <Clock className="h-5 w-5" />
            Trenutno aktivni Happy Hour-ji
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.activeHappyHours.map((hh) => (
              <Badge
                key={hh.id}
                variant="outline"
                className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
              >
                {hh.name} · {hh.startTime}–{hh.endTime} ·{" "}
                {hh.discountType === "percent"
                  ? `-${hh.discountValue}%`
                  : `-${hh.discountValue}€`}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Išči specialitete..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Trenutne specialitete */}
      {filteredSpecials.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ni dnevnih specialitet"
          description="Označi meni postavke kot dnevne specialitete z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSpecials.map((item) => (
            <Card
              key={item.id}
              className={`overflow-hidden ${!item.available ? "opacity-60" : ""}`}
            >
              <div className="aspect-video bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/50 dark:to-amber-900/20">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-amber-300/50" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
                  </div>
                  {item.hasDiscount && (
                    <Badge
                      variant="outline"
                      className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                      {item.activeDiscount}
                    </Badge>
                  )}
                </div>
                {item.desc && (
                  <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.hasDiscount ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatEUR(item.price)}
                        </span>
                        <span className="text-lg font-bold text-rose-600">
                          {formatEUR(item.discountedPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">{formatEUR(item.price)}</span>
                    )}
                  </div>
                  {item.calories && (
                    <Badge variant="outline" className="text-xs">
                      <Flame className="mr-1 h-3 w-3" />
                      {item.calories} kcal
                    </Badge>
                  )}
                </div>
                {!item.available && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    Trenutno ni na voljo
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uredi dnevne specialitete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Išči meni postavke..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto">
              {filteredMenuItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Ni meni postavk
                </p>
              ) : (
                filteredMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabel(item.category)} · {formatEUR(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isDailySpecial && (
                        <Badge variant="outline" className="text-amber-600">
                          <Star className="mr-1 h-3 w-3 fill-current" />
                          Specialiteta
                        </Badge>
                      )}
                      <Switch
                        checked={item.isDailySpecial}
                        onCheckedChange={(checked) => toggleSpecial(item.id, checked)}
                        disabled={updating === item.id}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Zapri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
