"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Package,
  AlertTriangle,
  Euro,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/components/pos/pin-login";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPerUnit: number;
  supplier: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const UNIT_OPTIONS = [
  { value: "kos", label: "kos" },
  { value: "kg", label: "kg" },
  { value: "l", label: "l" },
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
];

const CATEGORY_OPTIONS = [
  { value: "meso", label: "Meso" },
  { value: "zelenjava", label: "Zelenjava" },
  { value: "pijaca", label: "Pijača" },
  { value: "splosno", label: "Splošno" },
];

const CATEGORY_LABELS: Record<string, string> = {
  meso: "Meso",
  zelenjava: "Zelenjava",
  pijaca: "Pijača",
  splosno: "Splošno",
};

function isLowStock(it: InventoryItem): boolean {
  return it.quantity <= it.minQuantity;
}

export function InventoryView() {
  const { data, loading, error, refetch } = useFetch<InventoryItem[]>(
    "/api/inventory"
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  const items = data || [];
  const filtered = items.filter((m) => {
    if (!search.trim()) return true;
    return m.name.toLowerCase().includes(search.toLowerCase().trim());
  });

  const totalItems = items.length;
  const lowStockCount = items.filter(isLowStock).length;
  const stockValue = items.reduce(
    (sum, it) => sum + it.quantity * it.costPerUnit,
    0
  );

  async function saveItem(item: Partial<InventoryItem> & { id?: string }) {
    try {
      if (item.id) {
        const res = await fetch(`/api/inventory/${item.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Napaka");
        }
        toast.success("Izdelek posodobljen");
      } else {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Napaka");
        }
        toast.success("Izdelek dodan");
      }
      setEditing(null);
      setCreating(false);
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri shranjevanju");
    }
  }

  async function deleteItem(item: InventoryItem) {
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Napaka");
      }
      toast.success(`"${item.name}" izbrisan`);
      setDeleting(null);
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri brisanju");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Napaka pri nalaganju zaloge.
        </p>
        <Button variant="outline" onClick={refetch}>
          Poskusi znova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stat kartice */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Skupaj izdelkov"
          value={String(totalItems)}
          icon={Boxes}
          accent="neutral"
        />
        <StatCard
          label="Nizka zaloga"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          accent="rose"
          alert={lowStockCount > 0}
        />
        <StatCard
          label="Vrednost zaloge"
          value={formatEUR(stockValue)}
          icon={Euro}
          accent="emerald"
        />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Zaloga</h2>
          <p className="text-xs text-muted-foreground">
            {totalItems} izdelkov &middot; {lowStockCount} z nizko zalogo
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov izdelek
        </Button>
      </div>

      {/* Iskalnik */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Išči izdelek..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {items.length === 0 ? "Zaloga je prazna" : "Ni najdenih izdelkov"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length === 0
                ? "Dodajte prvi izdelek da začnete s spremljanjem zaloge."
                : "Poskusite spremeniti iskalni niz."}
            </p>
          </div>
          {items.length === 0 || search.trim() ? (
            <Button
              onClick={() => setCreating(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nov izdelek
            </Button>
          ) : null}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Ime</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead className="text-right">Količina</TableHead>
                <TableHead className="text-center">Enota</TableHead>
                <TableHead className="text-right">Nabavna cena</TableHead>
                <TableHead>Dobavitelj</TableHead>
                <TableHead className="pr-4 text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const low = isLowStock(m);
                return (
                  <TableRow
                    key={m.id}
                    className={cn(low && "bg-rose-50/40 dark:bg-rose-950/20")}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          {low && (
                            <Badge
                              variant="outline"
                              className="mt-0.5 border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Nizka zaloga
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[m.category] || m.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          low ? "text-rose-600 dark:text-rose-400" : ""
                        )}
                      >
                        {m.quantity}
                      </span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {m.minQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {m.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEUR(m.costPerUnit)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.supplier || "—"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
              <DialogTitle className="text-rose-600">Izbriši izdelek</DialogTitle>
              <DialogDescription>
                Ali res želiš izbrisati <strong>{deleting.name}</strong>?
                Dejanje je nepovratno. Če je izdelek v uporabi v receptih, ga
                ne morete izbrisati.
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

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  alert,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "neutral" | "rose";
  alert?: boolean;
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    neutral: "bg-muted text-foreground",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  };
  return (
    <Card className={cn("p-4", alert && "ring-2 ring-rose-300 dark:ring-rose-800")}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            accentClasses[accent]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function ItemDialog({
  item,
  onClose,
  onSave,
}: {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (data: Partial<InventoryItem> & { id?: string }) => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [unit, setUnit] = useState(item?.unit || "kos");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? ""));
  const [minQuantity, setMinQuantity] = useState(String(item?.minQuantity ?? ""));
  const [costPerUnit, setCostPerUnit] = useState(String(item?.costPerUnit ?? ""));
  const [supplier, setSupplier] = useState(item?.supplier || "");
  const [category, setCategory] = useState(item?.category || "splosno");

  function submit() {
    if (!name.trim()) {
      toast.error("Ime je obvezno");
      return;
    }
    onSave({
      id: item?.id,
      name: name.trim(),
      unit,
      quantity: parseFloat(quantity) || 0,
      minQuantity: parseFloat(minQuantity) || 0,
      costPerUnit: parseFloat(costPerUnit) || 0,
      supplier: supplier.trim() || null,
      category,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            {item ? "Uredi izdelek" : "Nov izdelek"}
          </DialogTitle>
          <DialogDescription>
            {item ? item.name : "Dodaj nov izdelek v zalogo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="name">Ime</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Goveja prsa"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="unit">Enota</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cat">Kategorija</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qty">Količina</Label>
              <Input
                id="qty"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="minQty">Min. količina</Label>
              <Input
                id="minQty"
                type="number"
                step="0.01"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cost">Nabavna cena (EUR / enota)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="supplier">Dobavitelj (opcijsko)</Label>
            <Input
              id="supplier"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="npr. Hofer"
            />
          </div>
        </div>

        <Separator />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Prekliči
          </Button>
          <Button
            onClick={submit}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {item ? "Shrani spremembe" : "Dodaj izdelek"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
