"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShoppingCart,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  RefreshCw,
  Printer,
  Send,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";

interface ReorderItem {
  id: string;
  name: string;
  unit: string;
  currentQty: number;
  minQty: number;
  suggestedQty: number;
  costPerUnit: number;
  totalCost: number;
  category: string;
}

interface ReorderSupplier {
  supplier: string;
  items: ReorderItem[];
  totalCost: number;
}

interface ReorderData {
  items: ReorderItem[];
  suppliers: ReorderSupplier[];
  summary: {
    totalItems: number;
    totalCost: number;
    supplierCount: number;
    message: string;
  };
}

// Kontakti dobaviteljev (hardcoded — v produkciji iz DB)
const SUPPLIER_CONTACTS: Record<string, { phone: string; email: string; website: string }> = {
  Mercator: { phone: "080 2000", email: "narocila@mercator.si", website: "www.mercator.si" },
  Hoop: { phone: "01 589 33 00", email: "narocanje@hoop.si", website: "www.hoop.si" },
  Jata: { phone: "01 589 21 00", email: "narocila@jata.si", website: "www.jata.si" },
  "Perutnina Ptuj": { phone: "02 749 31 00", email: "narocila@perutnina.si", website: "www.perutnina.si" },
  Mlinotest: { phone: "05 330 51 00", email: "info@mlinotest.si", website: "www.mlinotest.si" },
  "Mlekarna Celeia": { phone: "03 426 11 00", email: "info@celeia.si", website: "www.celeia.si" },
  Radenska: { phone: "02 520 31 00", email: "narocila@radenska.si", website: "www.radenska.si" },
  Laško: { phone: "03 700 31 00", email: "narocila@lator.si", website: "www.lasko.si" },
  Union: { phone: "01 477 41 00", email: "narocila@union.si", website: "www.union.si" },
  "Vinska klet": { phone: "07 332 61 00", email: "info@vinskaklet.si", website: "www.vinskaklet.si" },
  Barcaffe: { phone: "01 589 21 00", email: "info@barcaffe.si", website: "www.barcaffe.si" },
  Local: { phone: "—", email: "—", website: "—" },
  Kraški: { phone: "05 767 01 00", email: "info@kraski.si", website: "www.kraski.si" },
  Pekarna: { phone: "—", email: "—", website: "—" },
  Embalaža: { phone: "01 589 33 00", email: "info@embalaza.si", website: "—" },
  Ribarnica: { phone: "—", email: "—", website: "—" },
  "Lovska zveza": { phone: "—", email: "—", website: "—" },
  "Neznan dobavitelj": { phone: "—", email: "—", website: "—" },
};

const CATEGORY_ICONS: Record<string, string> = {
  meso: "🥩",
  ribe: "🐟",
  zelenjava: "🥕",
  sadje: "🍎",
  mlecni: "🥛",
  zita: "🌾",
  olja: "🫒",
  zacimbe: "🧂",
  sladkor: "🍯",
  kava: "☕",
  pijaca: "🥤",
  alkohol: "🍷",
  omake: "🥫",
  konzerve: "🥫",
  osnove: "📦",
  embalaza: "📦",
  splosno: "📦",
};

export function ReorderReport({ onUpdated }: { onUpdated: () => void }) {
  const [data, setData] = useState<ReorderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/reorder-report");
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
      // Razširitev prvega dobavitelja
      const data = await res.clone().json();
      if (data.suppliers && data.suppliers.length > 0) {
        setExpandedSuppliers(new Set([data.suppliers[0].supplier]));
      }
    } catch {
      toast.error("Napaka pri nalaganju poročila");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSupplier(name: string) {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function expandAll() {
    if (data) {
      setExpandedSuppliers(new Set(data.suppliers.map((s) => s.supplier)));
    }
  }

  function collapseAll() {
    setExpandedSuppliers(new Set());
  }

  function printReport() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500" />
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          Vse zaloge so v redu!
        </p>
        <p className="text-sm text-muted-foreground">
          Ni artiklov ki bi potrebovali naročilo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Poročilo naročil
          </h3>
          <p className="text-sm text-muted-foreground">{data.summary.message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Razširi vse
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Zloži vse
          </Button>
          <Button variant="outline" size="sm" onClick={printReport}>
            <Printer className="mr-1 h-3 w-3" />
            Natisni
          </Button>
          <Button size="sm" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Osveži
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <Package className="mx-auto mb-1 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{data.summary.totalItems}</p>
          <p className="text-xs text-muted-foreground">artiklov za naročilo</p>
        </Card>
        <Card className="p-3 text-center">
          <Truck className="mx-auto mb-1 h-5 w-5 text-blue-600" />
          <p className="text-2xl font-bold">{data.summary.supplierCount}</p>
          <p className="text-xs text-muted-foreground">dobaviteljev</p>
        </Card>
        <Card className="p-3 text-center">
          <ShoppingCart className="mx-auto mb-1 h-5 w-5 text-emerald-600" />
          <p className="text-2xl font-bold text-emerald-600">{formatEUR(data.summary.totalCost)}</p>
          <p className="text-xs text-muted-foreground">skupni strošek</p>
        </Card>
      </div>

      {/* Suppliers list */}
      <div className="space-y-2">
        {data.suppliers.map((supplier) => {
          const isExpanded = expandedSuppliers.has(supplier.supplier);
          const contact = SUPPLIER_CONTACTS[supplier.supplier];
          return (
            <Card key={supplier.supplier} className="overflow-hidden">
              {/* Supplier header */}
              <button
                onClick={() => toggleSupplier(supplier.supplier)}
                className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">{supplier.supplier}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.items.length} artiklov · {formatEUR(supplier.totalCost)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400">
                    {formatEUR(supplier.totalCost)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Supplier content */}
              {isExpanded && (
                <div className="border-t">
                  {/* Contact info */}
                  {contact && (
                    <div className="flex flex-wrap gap-3 border-b bg-muted/20 p-2 text-xs">
                      {contact.phone !== "—" && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email !== "—" && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {contact.email}
                        </span>
                      )}
                      {contact.website !== "—" && (
                        <span className="text-muted-foreground">{contact.website}</span>
                      )}
                    </div>
                  )}

                  {/* Items table */}
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        <th className="p-2 text-left font-medium">Artikel</th>
                        <th className="p-2 text-right font-medium">Trenutno</th>
                        <th className="p-2 text-right font-medium">Min</th>
                        <th className="p-2 text-right font-medium">Predlog</th>
                        <th className="p-2 text-right font-medium">Cena/kos</th>
                        <th className="p-2 text-right font-medium">Skupaj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.items.map((item) => (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <span>{CATEGORY_ICONS[item.category] || "📦"}</span>
                              <span className="font-medium">{item.name}</span>
                              {item.currentQty === 0 && (
                                <AlertTriangle className="h-3 w-3 text-rose-500" />
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right font-mono">
                            <span className={item.currentQty === 0 ? "text-rose-600 font-bold" : ""}>
                              {item.currentQty} {item.unit}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono text-muted-foreground">
                            {item.minQty}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-primary">
                            {item.suggestedQty} {item.unit}
                          </td>
                          <td className="p-2 text-right font-mono text-muted-foreground">
                            {formatEUR(item.costPerUnit)}
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatEUR(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-muted/30">
                      <tr>
                        <td colSpan={5} className="p-2 text-right font-semibold">Skupaj {supplier.supplier}:</td>
                        <td className="p-2 text-right font-bold text-primary">
                          {formatEUR(supplier.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Send order email */}
                  <div className="border-t p-2">
                    <SupplierEmailButton
                      supplier={supplier.supplier}
                      items={supplier.items}
                      contact={contact}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Total */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Skupni predvideni strošek naročil</p>
            <p className="text-3xl font-bold text-primary">{formatEUR(data.summary.totalCost)}</p>
          </div>
          <ShoppingCart className="h-12 w-12 text-primary/30" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          💡 Predlagane količine so izračunane kot min×2 ali minimum 10 enot.
          Prilagodi po potrebi v Zalogi → Bulk zaloga.
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// Supplier Email Button — pošlji naročilo dobavitelju
// ============================================================

function SupplierEmailButton({
  supplier,
  items,
  contact,
}: {
  supplier: string;
  items: ReorderItem[];
  contact?: { phone: string; email: string; website: string };
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendOrder() {
    if (!contact || contact.email === "—") {
      toast.error("Ni email naslova za tega dobavitelja");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/inventory/reorder-email", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          supplier,
          email: contact.email,
          items: items.map((i) => ({
            name: i.name,
            quantity: i.suggestedQty,
            unit: i.unit,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      setSent(true);
    } catch {
      toast.error("Napaka pri pošiljanju");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Naročilo poslano na {contact?.email}
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      onClick={sendOrder}
      disabled={sending || !contact || contact.email === "—"}
    >
      {sending ? (
        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
      ) : (
        <Send className="mr-1.5 h-3 w-3" />
      )}
      {sending ? "Pošiljam..." : `Pošlji naročilo na ${contact?.email || "—"}`}
    </Button>
  );
}
