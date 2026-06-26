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
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MenuAdminView() {
  const { data, loading, error, refetch } = useFetch<MenuItem[]>("/api/menu");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("vse");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Urejanje menija</h2>
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
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-12 gap-2 bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <div className="col-span-5">Naziv</div>
              <div className="col-span-2">Kategorija</div>
              <div className="col-span-2 text-right">Cena</div>
              <div className="col-span-2 text-center">DDV</div>
              <div className="col-span-1 text-center">Aktivna</div>
            </div>
            {filtered.map((m) => {
              const cat = CATEGORIES.find((c) => c.id === m.category);
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-12 items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted/30"
                >
                  <div className="col-span-12 sm:col-span-5">
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
                  <div className="col-span-2 text-center text-xs text-muted-foreground sm:col-span-2">
                    {(m.vatRate * 100).toFixed(1)}%
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1 sm:col-span-1">
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
