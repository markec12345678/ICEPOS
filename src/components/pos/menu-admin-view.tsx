"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import {
  CATEGORIES,
  formatEUR,
  type MenuCategory,
  type MenuItem,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Search,
  AlertCircle,
  BookOpen,
  Calculator,
  Star,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MenuAdminView() {
  const { data, loading, error, refetch } = useFetch<MenuItem[]>("/api/menu");
  const { data: recipes } = useFetch<{
    id: string;
    menuItemId: string;
    inventoryItemId: string;
    quantity: number;
    inventoryItem: { name: string; costPerUnit: number; unit: string };
  }[]>("/api/recipes");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("vse");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);

  // Izračunaj food cost per menu item
  const recipeMap = new Map<string, { foodCost: number; ingredients: { name: string; qty: number; cost: number; unit: string }[] }>();
  for (const r of recipes || []) {
    const existing = recipeMap.get(r.menuItemId);
    const lineCost = r.quantity * r.inventoryItem.costPerUnit;
    if (existing) {
      existing.foodCost += lineCost;
      existing.ingredients.push({ name: r.inventoryItem.name, qty: r.quantity, cost: lineCost, unit: r.inventoryItem.unit });
    } else {
      recipeMap.set(r.menuItemId, {
        foodCost: lineCost,
        ingredients: [{ name: r.inventoryItem.name, qty: r.quantity, cost: lineCost, unit: r.inventoryItem.unit }],
      });
    }
  }

  const items = data || [];
  const filtered = items.filter((m) => {
    if (catFilter !== "vse" && m.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q);
    }
    return true;
  });

  async function saveItem(item: Partial<MenuItem> & { id?: string }) {
    try {
      if (item.id) {
        const res = await fetch(`/api/menu/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error("Napaka");
        toast.success("Postavka posodobljena");
      } else {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error("Napaka");
        toast.success("Postavka dodana");
      }
      setEditing(null);
      setCreating(false);
      refetch();
    } catch {
      toast.error("Napaka pri shranjevanju");
    }
  }

  async function deleteItem(item: MenuItem) {
    try {
      const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Napaka");
      toast.success(`"${item.name}" izbrisana`);
      setDeleting(null);
      refetch();
    } catch {
      toast.error("Napaka pri brisanju");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <Button variant="outline" onClick={refetch}>
          Poskusi znova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Urejanje menija</h2>
          <p className="text-xs text-muted-foreground">
            {items.length} postavk &middot;{" "}
            {items.filter((m) => m.available).length} aktivnih
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Nova postavka
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči postavko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vse">Vse kategorije</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela postavk */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BookOpen className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {items.length === 0 ? "Meni je prazen" : "Ni najdenih postavk"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length === 0
                ? "Dodajte prvo postavko da začnete z gradnjo menija."
                : "Poskusite spremeniti iskalni niz ali kategorijo."}
            </p>
          </div>
          {items.length === 0 || search.trim() || catFilter !== "vse" ? (
            <Button
              onClick={() => setCreating(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nova postavka
            </Button>
          ) : null}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-12 gap-2 bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <div className="col-span-4">Naziv</div>
              <div className="col-span-2">Kategorija</div>
              <div className="col-span-2 text-right">Cena</div>
              <div className="col-span-1 text-center">DDV</div>
              <div className="col-span-2 text-center">Food cost</div>
              <div className="col-span-1 text-center">Aktivna</div>
            </div>
            {filtered.map((m) => {
              const cat = CATEGORIES.find((c) => c.id === m.category);
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat?.icon || "🍽️"}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.name}</p>
                        {m.desc && (
                          <p className="truncate text-xs text-muted-foreground">
                            {m.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {cat?.label || m.category}
                    </Badge>
                  </div>
                  <div className="col-span-3 text-right font-semibold sm:col-span-2">
                    {formatEUR(m.price)}
                  </div>
                  <div className="col-span-2 text-center text-xs text-muted-foreground sm:col-span-1">
                    {(m.vatRate * 100).toFixed(1)}%
                  </div>
                  {/* Food cost % */}
                  <div className="col-span-2 text-center sm:col-span-2">
                    {(() => {
                      const recipe = recipeMap.get(m.id);
                      if (!recipe || m.price === 0) {
                        return <span className="text-xs text-muted-foreground">—</span>;
                      }
                      const foodCostPct = (recipe.foodCost / m.price) * 100;
                      const margin = ((m.price - recipe.foodCost) / m.price) * 100;
                      const color = foodCostPct > 40 ? "text-rose-600 dark:text-rose-400" : foodCostPct > 30 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
                      return (
                        <div>
                          <p className={cn("text-xs font-bold", color)}>
                            {foodCostPct.toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatEUR(recipe.foodCost)} → {margin.toFixed(0)}% marže
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1 sm:col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${m.available ? "text-emerald-600" : "text-muted-foreground"}`}
                      onClick={async () => {
                        await fetch(`/api/menu/${m.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ available: !m.available }),
                        });
                        refetch();
                        toast.success(m.available ? `Skrito: ${m.name}` : `Aktivirano: ${m.name}`, {
                          description: m.available ? "86 — jed ni več na voljo v meniju" : "Jed je spet na voljo",
                          duration: 2000,
                        });
                      }}
                      title={m.available ? "Skrij iz menija (86)" : "Prikaži v meniju"}
                    >
                      {m.available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 ${m.isFavorite ? "text-amber-500" : "text-muted-foreground"}`}
                      onClick={async () => {
                        await fetch(`/api/menu/${m.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isFavorite: !m.isFavorite }),
                        });
                        refetch();
                      }}
                      title="Priljubljena"
                    >
                      <Star className={`h-3.5 w-3.5 ${m.isFavorite ? "fill-amber-400" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 text-[10px] font-bold ${m.isDailySpecial ? "text-rose-600" : "text-muted-foreground"}`}
                      onClick={async () => {
                        await fetch(`/api/menu/${m.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ isDailySpecial: !m.isDailySpecial }),
                        });
                        refetch();
                      }}
                      title="Dnevna ponudba"
                    >
                      DANA
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditing(m)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      onClick={() => setDeleting(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recipe Costing — food cost analiza */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-bold">Food Cost Analiza</h3>
            <p className="text-xs text-muted-foreground">
              Strošek sestavin per jed · marža · food cost %
            </p>
          </div>
        </div>

        {/* Legenda */}
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            &lt; 30% (odlično)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            30-40% (sprejemljivo)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            &gt; 40% (previsoko)
          </span>
        </div>

        {items.filter((m) => recipeMap.has(m.id)).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ni receptov. Dodaj recepte v Inventory → Recipe sekcija za izračun food cost-a.
          </p>
        ) : (
          <div className="space-y-2">
            {items
              .filter((m) => recipeMap.has(m.id))
              .map((m) => {
                const recipe = recipeMap.get(m.id)!;
                const foodCostPct = m.price > 0 ? (recipe.foodCost / m.price) * 100 : 0;
                const margin = m.price - recipe.foodCost;
                const marginPct = m.price > 0 ? (margin / m.price) * 100 : 0;
                const color = foodCostPct > 40 ? "rose" : foodCostPct > 30 ? "amber" : "emerald";
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cena: {formatEUR(m.price)} · Strošek: {formatEUR(recipe.foodCost)} · Marža: {formatEUR(margin)} ({marginPct.toFixed(0)}%)
                        </p>
                      </div>
                      <div className="ml-3 text-right">
                        <p
                          className={cn(
                            "text-lg font-bold",
                            color === "rose" && "text-rose-600 dark:text-rose-400",
                            color === "amber" && "text-amber-600 dark:text-amber-400",
                            color === "emerald" && "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {foodCostPct.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">food cost</p>
                      </div>
                    </div>
                    {/* Sestavine */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {recipe.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {ing.name}: {ing.qty}{ing.unit} ({formatEUR(ing.cost)})
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      {/* Dialog: urejanje/ustvarjanje */}
      {(editing || creating) && (
        <ItemDialog
          item={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={saveItem}
        />
      )}

      {/* Dialog: brisanje */}
      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-rose-600">Izbriši postavko</DialogTitle>
              <DialogDescription>
                Ali res želiš izbrisati <strong>{deleting.name}</strong>?
                Dejanje je nepovratno. Če je postavka že na računih, jo raje
                deaktiviraj.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Prekliči
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => deleteItem(deleting)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Izbriši
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ItemDialog({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onSave: (data: Partial<MenuItem> & { id?: string }) => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState<MenuCategory>(
    (item?.category as MenuCategory) || "glavne_jedi"
  );
  const [price, setPrice] = useState(String(item?.price ?? ""));
  const [vatRate, setVatRate] = useState(
    String(item?.vatRate ?? 0.095)
  );
  const [desc, setDesc] = useState(item?.desc || "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [isFavorite, setIsFavorite] = useState(item?.isFavorite ?? false);
  const [isDailySpecial, setIsDailySpecial] = useState(item?.isDailySpecial ?? false);

  function submit() {
    if (!name.trim() || !price) {
      toast.error("Ime in cena sta obvezna");
      return;
    }
    onSave({
      id: item?.id,
      name: name.trim(),
      category,
      price: parseFloat(price),
      vatRate: parseFloat(vatRate),
      desc: desc.trim() || null,
      available,
      isFavorite,
      isDailySpecial,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-600" />
            {item ? "Uredi postavko" : "Nova postavka"}
          </DialogTitle>
          <DialogDescription>
            {item ? item.name : "Dodaj novo jed ali pijačo v meni."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="name">Naziv</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Žlikrofi s pečenico"
            />
          </div>
          <div>
            <Label htmlFor="desc">Opis (opcijsko)</Label>
            <Input
              id="desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="npr. Idrijski žlikrofi, pečenica, zaliv"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cat">Kategorija</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as MenuCategory)}
              >
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="price">Cena (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="12.50"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="vat">Stopnja DDV</Label>
            <Select value={vatRate} onValueChange={setVatRate}>
              <SelectTrigger id="vat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.095">9,5% (znižana — hrana)</SelectItem>
                <SelectItem value="0.22">22% (splošna — alkohol)</SelectItem>
                <SelectItem value="0.05">5% (posebej znižana)</SelectItem>
                <SelectItem value="0">0% (oproščeno)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="avail" className="cursor-pointer">
                Aktivna
              </Label>
              <p className="text-xs text-muted-foreground">
                Neaktivne postavke se ne prikažejo v naročanju.
              </p>
            </div>
            <Switch
              id="avail"
              checked={available}
              onCheckedChange={setAvailable}
            />
          </div>

          {/* Priljubljene */}
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
            <div>
              <Label htmlFor="fav" className="cursor-pointer">
                ⭐ Priljubljena
              </Label>
              <p className="text-xs text-muted-foreground">
                Prikazuje se v hitrem filterju "Priljubljene"
              </p>
            </div>
            <Switch
              id="fav"
              checked={isFavorite}
              onCheckedChange={setIsFavorite}
            />
          </div>

          {/* Dnevna ponudba */}
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
            <div>
              <Label htmlFor="spec" className="cursor-pointer">
                🍽️ Dnevna ponudba
              </Label>
              <p className="text-xs text-muted-foreground">
                Menu dneva — prikazuje se v filterju "Dnevno"
              </p>
            </div>
            <Switch
              id="spec"
              checked={isDailySpecial}
              onCheckedChange={setIsDailySpecial}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          <Button
            onClick={submit}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {item ? "Shrani spremembe" : "Dodaj postavko"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
