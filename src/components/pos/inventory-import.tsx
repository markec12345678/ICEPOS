"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package,
  Search,
  Plus,
  Check,
  Loader2,
  FileText,
  Upload,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";

interface CatalogItem {
  name: string;
  unit: string;
  category: string;
  minQuantity: number;
  costPerUnit: number;
  supplier: string;
}

interface CatalogCategory {
  id: string;
  label: string;
  icon: string;
}

interface InvoiceItem {
  name: string;
  quantity: number;
  unit?: string;
  costPerUnit?: number;
}

export function InventoryImport({ onImported }: { onImported: () => void }) {
  const [tab, setTab] = useState<"catalog" | "invoice">("catalog");

  return (
    <Card className="p-4">
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("catalog")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "catalog" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          Katalog (500+)
        </button>
        <button
          onClick={() => setTab("invoice")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === "invoice" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Uvoz dobavnice
        </button>
      </div>

      {tab === "catalog" && <CatalogImport onImported={onImported} />}
      {tab === "invoice" && <InvoiceImport onImported={onImported} />}
    </Card>
  );
}

// ============================================================
// Catalog Import
// ============================================================

function CatalogImport({ onImported }: { onImported: () => void }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/inventory/import-catalog");
      const data = await res.json();
      setCatalog(data.items || []);
      setCategories(data.categories || []);
    } catch {
      toast.error("Napaka pri nalaganju kataloga");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = catalog.filter((item) => {
    if (search) {
      return item.name.toLowerCase().includes(search.toLowerCase());
    }
    if (activeCategory !== "all") {
      return item.category === activeCategory;
    }
    return true;
  });

  function toggleSelect(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function selectAllInCategory() {
    const names = filtered.map((i) => i.name);
    setSelected((prev) => {
      const next = new Set(prev);
      names.forEach((n) => next.add(n));
      return next;
    });
  }

  async function importSelected() {
    if (selected.size === 0) {
      toast.error("Izberi vsaj en artikel");
      return;
    }
    setImporting(true);
    try {
      const items = catalog.filter((c) => selected.has(c.name));
      const res = await fetch("/api/inventory/import-catalog", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      setSelected(new Set());
      onImported();
    } catch {
      toast.error("Napaka pri uvozu");
    } finally {
      setImporting(false);
    }
  }

  async function importAll() {
    setImporting(true);
    try {
      const res = await fetch("/api/inventory/import-catalog", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      onImported();
    } catch {
      toast.error("Napaka pri uvozu");
    } finally {
      setImporting(false);
    }
  }

  async function importCategory(catId: string) {
    setImporting(true);
    try {
      const res = await fetch("/api/inventory/import-catalog", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ all: true, category: catId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      onImported();
    } catch {
      toast.error("Napaka pri uvozu");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const catStats = catalog.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {catalog.length} artiklov v katalogu · {selected.size} izbranih
        </p>
        <div className="flex gap-2">
          {selected.size > 0 ? (
            <Button size="sm" onClick={importSelected} disabled={importing}>
              {importing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
              Uvozi {selected.size}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={importAll} disabled={importing}>
              <Sparkles className="mr-1 h-3 w-3" />
              Uvozi vse ({catalog.length})
            </Button>
          )}
        </div>
      </div>

      {/* Category buttons */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          Vse ({catalog.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            onDoubleClick={() => importCategory(cat.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
            title={`Dvojni klik za uvoz cele kategorije`}
          >
            {cat.icon} {cat.label} ({catStats[cat.id] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Išči artikel..."
          className="pl-9"
        />
      </div>

      {/* Select all */}
      {filtered.length > 0 && (
        <button
          onClick={selectAllInCategory}
          className="text-xs text-primary hover:underline"
        >
          Izberi vse ({filtered.length})
        </button>
      )}

      {/* Items list */}
      <div className="max-h-96 space-y-1 overflow-y-auto">
        {filtered.map((item) => {
          const isSelected = selected.has(item.name);
          return (
            <button
              key={item.name}
              onClick={() => toggleSelect(item.name)}
              className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.supplier} · {formatEUR(item.costPerUnit)}/{item.unit} · min: {item.minQuantity}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {item.unit}
              </Badge>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Dvojni klik na kategorijo = uvozi vse iz te kategorije. Vsi uvoženi artikli imajo stanje 0.
      </p>
    </div>
  );
}

// ============================================================
// Invoice Import (dobavnica)
// ============================================================

function InvoiceImport({ onImported }: { onImported: () => void }) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: "", quantity: 1, unit: "kos" },
  ]);
  const [importing, setImporting] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  function addItem() {
    setItems([...items, { name: "", quantity: 1, unit: "kos" }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function parseCsv() {
    // Razčleni CSV: ime,količina,enota,cena
    const lines = csvText.trim().split("\n");
    const parsed: InvoiceItem[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t;]/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0]) {
        parsed.push({
          name: parts[0],
          quantity: parseFloat(parts[1]) || 1,
          unit: parts[2] || "kos",
          costPerUnit: parts[3] ? parseFloat(parts[3]) : undefined,
        });
      }
    }
    if (parsed.length > 0) {
      setItems(parsed);
      setCsvOpen(false);
      toast.success(`Razčlenjenih ${parsed.length} artiklov`);
    } else {
      toast.error("Ni veljavnih vrstic");
    }
  }

  async function importInvoice() {
    const validItems = items.filter((i) => i.name && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Dodaj vsaj en veljaven artikel");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/inventory/import-invoice", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          supplier,
          invoiceNumber,
          date: new Date().toISOString().slice(0, 10),
          items: validItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      setItems([{ name: "", quantity: 1, unit: "kos" }]);
      setSupplier("");
      setInvoiceNumber("");
      onImported();
    } catch {
      toast.error("Napaka pri uvozu");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
        <ShoppingCart className="mr-1 inline h-3 w-3" />
        Vnesi dobavnico ročno ali prilepi CSV. Sistem samodejno posodobi zaloge
        (obstoječi artikli se povečajo, novi se ustvarijo).
      </div>

      {/* Dobavitelj + številka */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="mb-1 block text-xs">Dobavitelj</Label>
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="npr. Mercator"
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Številka dobavnice</Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="npr. DOB-2025-1234"
          />
        </div>
      </div>

      {/* CSV import */}
      <Button variant="outline" size="sm" className="w-full" onClick={() => setCsvOpen(true)}>
        <Upload className="mr-1.5 h-3 w-3" />
        Prilepi CSV (ime,količina,enota,cena)
      </Button>

      {/* Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Postavke dobavnice ({items.length})</Label>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Dodaj
          </Button>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-1">
              <Input
                value={item.name}
                onChange={(e) => updateItem(idx, "name", e.target.value)}
                placeholder="Ime artikla"
                className="flex-1"
              />
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                placeholder="Kol."
                className="w-20"
              />
              <Input
                value={item.unit || "kos"}
                onChange={(e) => updateItem(idx, "unit", e.target.value)}
                placeholder="Enota"
                className="w-16"
              />
              <Input
                type="number"
                step="0.01"
                value={item.costPerUnit || ""}
                onChange={(e) => updateItem(idx, "costPerUnit", parseFloat(e.target.value) || 0)}
                placeholder="Cena"
                className="w-20"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={importInvoice} disabled={importing}>
        {importing ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-1.5 h-4 w-4" />
        )}
        {importing ? "Uvažam..." : "Uvozi dobavnico"}
      </Button>

      <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-semibold">📧 Avtomatski uvoz iz emaila (v produkciji):</p>
        <p className="mt-1">
          1. Nastavi email naslov (npr. doba@tvoja-domena.si) pri dobaviteljih<br />
          2. Sistem samodejno razčleni PDF/CSV dobavnice<br />
          3. Zaloge se posodobijo brez ročnega vnosa<br />
          4. Podprti formati: CSV, JSON, PDF (z OCR)
        </p>
      </div>

      {/* CSV dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prilepi CSV dobavnice</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Format: ime, količina, enota, cena (ena vrstica na artikel)
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"Krompir,50,kg,0.60\nČebula,10,kg,0.80\nMleko,20,l,0.90"}
              className="h-40 w-full rounded-lg border p-3 font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>
              Prekliči
            </Button>
            <Button onClick={parseCsv}>Razčleni</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
