"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Trash2,
  Edit,
  Send,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Truck,
  Calendar,
  Euro,
  FileText,
  Eye,
  PackageOpen,
  Receipt,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";
import { useUndo } from "@/hooks/use-undo";

// ============================================================
// Tipi
// ============================================================

type POStatus = "draft" | "sent" | "received" | "cancelled";

interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  inventoryItemId: string | null;
  name: string;
  quantity: number;
  receivedQty: number;
  unit: string;
  unitCost: number;
  lineTotal: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
}

interface PurchaseOrder {
  id: string;
  restaurantId: string;
  supplierId: string | null;
  supplier: Supplier | null;
  poNumber: string;
  status: POStatus;
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  totalAmount: number;
  discountPercent: number;
  note: string | null;
  operator: string | null;
  items: PurchaseOrderItem[];
}

interface DraftItem {
  key: string;
  inventoryItemId: string | null;
  name: string;
  quantity: string;
  unit: string;
  unitCost: string;
}

const UNITS = ["kos", "kg", "l", "g", "ml"];

const STATUS_META: Record<
  POStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Osnutek",
    className:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  sent: {
    label: "Poslano",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  received: {
    label: "Prejeto",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
  cancelled: {
    label: "Preklicano",
    className:
      "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

// ============================================================
// Glavna komponenta
// ============================================================

export function PurchaseOrderView() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | POStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const { confirmDestructive } = useUndo();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, supRes, invRes] = await Promise.all([
        fetch("/api/purchase-orders", { headers: authHeaders() }),
        fetch("/api/suppliers", { headers: authHeaders() }),
        fetch("/api/inventory", { headers: authHeaders() }),
      ]);
      if (!poRes.ok) throw new Error("Napaka");
      setPurchaseOrders(await poRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (invRes.ok) setInventory(await invRes.json());
    } catch {
      toast.error("Napaka pri nalaganju nabavnih nalogov");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // KPI izračuni
  const kpis = useMemo(() => {
    const total = purchaseOrders.length;
    const draft = purchaseOrders.filter((p) => p.status === "draft").length;
    const sent = purchaseOrders.filter((p) => p.status === "sent").length;
    const received = purchaseOrders.filter(
      (p) => p.status === "received"
    ).length;
    return { total, draft, sent, received };
  }, [purchaseOrders]);

  // Filtrirana lista
  const filtered = useMemo(() => {
    if (filter === "all") return purchaseOrders;
    return purchaseOrders.filter((p) => p.status === filter);
  }, [purchaseOrders, filter]);

  // Async akcije na PO
  async function changeStatus(po: PurchaseOrder, status: POStatus) {
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Napaka");
      }
      const updated = (await res.json()) as PurchaseOrder;
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setDetailPO(updated);
      if (status === "sent") toast.success("Nabavni nalog poslan dobavitelju");
      else if (status === "received")
        toast.success("Nabavni nalog označen kot prejet — zaloga posodobljena");
      else if (status === "cancelled") toast.success("Nabavni nalog preklican");
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri posodobitvi");
    }
  }

  function handleDelete(po: PurchaseOrder) {
    confirmDestructive(
      `Izbriši nabavni nalog ${po.poNumber}?`,
      "Dejanja ni mogoče razveljaviti.",
      async () => {
        try {
          const res = await fetch(`/api/purchase-orders/${po.id}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Napaka");
          }
          toast.success("Nabavni nalog izbrisan");
          setPurchaseOrders((prev) => prev.filter((p) => p.id !== po.id));
          setDetailPO(null);
        } catch (e) {
          toast.error((e as Error).message || "Napaka pri brisanju");
        }
      },
      { confirmLabel: "Izbriši", cancelLabel: "Prekliči" }
    );
  }

  const FILTERS: Array<{ id: "all" | POStatus; label: string; count: number }> = [
    { id: "all", label: "Vsi", count: kpis.total },
    { id: "draft", label: "Osnutki", count: kpis.draft },
    { id: "sent", label: "Poslani", count: kpis.sent },
    { id: "received", label: "Prejeti", count: kpis.received },
    {
      id: "cancelled",
      label: "Preklicani",
      count: purchaseOrders.filter((p) => p.status === "cancelled").length,
    },
  ];

  if (loading) {
    return <LoadingSpinner label="Nalagam nabavne naloge..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ClipboardList className="h-6 w-6 text-amber-600" />
            Nabavni nalogi
          </h2>
          <p className="text-sm text-muted-foreground">
            Upravljanje naročil pri dobaviteljih
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setCreateOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nov nabavni nalog
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<ClipboardList className="h-4 w-4" />}
          label="Skupaj nalogov"
          value={String(kpis.total)}
          accent="amber"
        />
        <KpiCard
          icon={<FileText className="h-4 w-4" />}
          label="V osnutku"
          value={String(kpis.draft)}
          accent="slate"
        />
        <KpiCard
          icon={<Send className="h-4 w-4" />}
          label="V teku"
          value={String(kpis.sent)}
          accent="sky"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Prejeti"
          value={String(kpis.received)}
          accent="emerald"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              filter === f.id
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* PO list */}
      {filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={ClipboardList}
            title={
              purchaseOrders.length === 0
                ? "Ni nabavnih nalogov"
                : "Ni rezultatov za izbran filter"
            }
            description={
              purchaseOrders.length === 0
                ? "Ustvari prvi nabavni nalog za naročanje pri dobaviteljih."
                : "Poskusi z drugačnim filtrom."
            }
            action={
              purchaseOrders.length === 0
                ? {
                    label: "Nov nabavni nalog",
                    onClick: () => {
                      setEditing(null);
                      setCreateOpen(true);
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((po) => (
            <POCard
              key={po.id}
              po={po}
              onView={() => setDetailPO(po)}
              onEdit={() => {
                setEditing(po);
                setCreateOpen(true);
              }}
              onDelete={() => handleDelete(po)}
              onSend={() => changeStatus(po, "sent")}
              onReceive={() => changeStatus(po, "received")}
              onCancel={() => changeStatus(po, "cancelled")}
            />
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <CreatePODialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editing={editing}
        suppliers={suppliers}
        inventory={inventory}
        onSaved={load}
      />

      {/* Detail dialog */}
      <DetailPODialog
        po={detailPO}
        onOpenChange={(o) => !o && setDetailPO(null)}
        onSend={(po) => changeStatus(po, "sent")}
        onReceive={(po) => changeStatus(po, "received")}
        onCancel={(po) => changeStatus(po, "cancelled")}
        onEdit={(po) => {
          setDetailPO(null);
          setEditing(po);
          setCreateOpen(true);
        }}
        onDelete={(po) => handleDelete(po)}
      />
    </div>
  );
}

// ============================================================
// KPI kartica
// ============================================================

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "amber" | "emerald" | "slate" | "sky";
}) {
  const accentClasses: Record<typeof accent, string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    emerald:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

// ============================================================
// Kartica nabavnega naloga (list)
// ============================================================

function POCard({
  po,
  onView,
  onEdit,
  onDelete,
  onSend,
  onReceive,
  onCancel,
}: {
  po: PurchaseOrder;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSend: () => void;
  onReceive: () => void;
  onCancel: () => void;
}) {
  const statusMeta = STATUS_META[po.status];
  return (
    <Card className="flex flex-col p-4">
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-amber-600" />
            <h3 className="truncate font-semibold">{po.poNumber}</h3>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" />
            <span className="truncate">
              {po.supplier?.name ?? "Brez dobavitelja"}
            </span>
          </p>
        </div>
        <Badge className={`shrink-0 ${statusMeta.className}`}>
          {statusMeta.label}
        </Badge>
      </div>

      {/* Details */}
      <div className="mt-3 flex-1 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Naročilo: {formatDate(po.orderDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Pričakovano:{" "}
            <span className={po.expectedDate ? "" : "italic"}>
              {formatDate(po.expectedDate)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <PackageOpen className="h-3.5 w-3.5" />
          <span>{po.items.length} postavk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Euro className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground">
            {formatEUR(po.totalAmount)}
          </span>
          {po.discountPercent > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
            >
              -{po.discountPercent}%
            </Badge>
          )}
        </div>
        {po.receivedDate && (
          <div className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Prejeto: {formatDate(po.receivedDate)}</span>
          </div>
        )}
        {po.note && (
          <p className="mt-1 line-clamp-1 rounded-md bg-muted/40 px-2 py-1 text-xs italic">
            {po.note}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="h-8"
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          Podrobnosti
        </Button>
        <div className="flex gap-1">
          {po.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSend}
                aria-label="Pošlji dobavitelju"
                title="Pošlji dobavitelju"
              >
                <Send className="h-4 w-4 text-sky-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
                aria-label="Uredi"
                title="Uredi"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label="Izbriši"
                title="Izbriši"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {po.status === "sent" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onReceive}
                aria-label="Označi kot prejeto"
                title="Označi kot prejeto"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onCancel}
                aria-label="Prekliči"
                title="Prekliči"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {po.status === "received" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onView}
              aria-label="Podrobnosti"
            >
              <Receipt className="h-4 w-4" />
            </Button>
          )}
          {po.status === "cancelled" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onView}
              aria-label="Podrobnosti"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Create / Edit dialog
// ============================================================

function CreatePODialog({
  open,
  onOpenChange,
  editing,
  suppliers,
  inventory,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: PurchaseOrder | null;
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onSaved: () => void;
}) {
  const [supplierId, setSupplierId] = useState<string>("none");
  const [expectedDate, setExpectedDate] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { key: crypto.randomUUID(), inventoryItemId: null, name: "", quantity: "1", unit: "kos", unitCost: "0" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setSupplierId(editing.supplierId ?? "none");
      setExpectedDate(
        editing.expectedDate
          ? new Date(editing.expectedDate).toISOString().slice(0, 10)
          : ""
      );
      setDiscountPercent(String(editing.discountPercent ?? 0));
      setNote(editing.note ?? "");
      setItems(
        editing.items.map((it) => ({
          key: crypto.randomUUID(),
          inventoryItemId: it.inventoryItemId,
          name: it.name,
          quantity: String(it.quantity),
          unit: it.unit,
          unitCost: String(it.unitCost),
        }))
      );
    } else {
      setSupplierId("none");
      setExpectedDate("");
      setDiscountPercent("0");
      setNote("");
      setItems([
        {
          key: crypto.randomUUID(),
          inventoryItemId: null,
          name: "",
          quantity: "1",
          unit: "kos",
          unitCost: "0",
        },
      ]);
    }
  }, [open, editing]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        inventoryItemId: null,
        name: "",
        quantity: "1",
        unit: "kos",
        unitCost: "0",
      },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((i) => i.key !== key)
    );
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i))
    );
  }

  function selectInventoryItem(key: string, invId: string) {
    if (invId === "none") {
      updateItem(key, { inventoryItemId: null });
      return;
    }
    const inv = inventory.find((i) => i.id === invId);
    if (!inv) return;
    updateItem(key, {
      inventoryItemId: inv.id,
      name: inv.name,
      unit: inv.unit,
      unitCost: String(inv.costPerUnit),
    });
  }

  // Live izračuni
  const calc = useMemo(() => {
    let subtotal = 0;
    for (const it of items) {
      const q = parseFloat(it.quantity) || 0;
      const c = parseFloat(it.unitCost) || 0;
      subtotal += q * c;
    }
    const disc = parseFloat(discountPercent) || 0;
    const discountAmount = subtotal * (disc / 100);
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total, disc };
  }, [items, discountPercent]);

  async function save() {
    // Validacija
    const validItems = items.filter((i) => i.name.trim());
    if (validItems.length === 0) {
      toast.error("Dodaj vsaj eno postavko z imenom");
      return;
    }
    for (const it of validItems) {
      const q = parseFloat(it.quantity);
      const c = parseFloat(it.unitCost);
      if (!q || q <= 0) {
        toast.error(`Količina za "${it.name}" mora biti pozitivna`);
        return;
      }
      if (isNaN(c) || c < 0) {
        toast.error(`Cena za "${it.name}" ni veljavna`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: supplierId === "none" ? null : supplierId,
        expectedDate: expectedDate || null,
        discountPercent: parseFloat(discountPercent) || 0,
        note: note.trim() || null,
        items: validItems.map((it) => ({
          name: it.name.trim(),
          inventoryItemId: it.inventoryItemId,
          quantity: parseFloat(it.quantity),
          unit: it.unit,
          unitCost: parseFloat(it.unitCost),
        })),
      };

      // POST vedno za nov; za urejanje omejimo na PATCH (note, expectedDate, discountPercent)
      let url = "/api/purchase-orders";
      let method = "POST";
      if (editing) {
        // Urejanje obstoječega (samo v draft statusu) — PATCH na /api/purchase-orders/[id]
        url = `/api/purchase-orders/${editing.id}`;
        method = "PATCH";
      }

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Napaka");
      }
      toast.success(
        editing ? "Nabavni nalog posodobljen" : "Nabavni nalog ustvarjen"
      );
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  const isDraftOrNew = !editing || editing.status === "draft";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Uredi nabavni nalog ${editing.poNumber}`
              : "Nov nabavni nalog"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supplier + dates row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-sm">Dobavitelj</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brez dobavitelja</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="po-expected" className="mb-1.5 block text-sm">
                Pričakovani datum
              </Label>
              <Input
                id="po-expected"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                disabled={!isDraftOrNew}
              />
            </div>
            <div>
              <Label htmlFor="po-discount" className="mb-1.5 block text-sm">
                Rabat %
              </Label>
              <Input
                id="po-discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                disabled={!isDraftOrNew}
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="po-note" className="mb-1.5 block text-sm">
              Opomba
            </Label>
            <Textarea
              id="po-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Interni podatki, navodila dobavitelju..."
              rows={2}
              disabled={!isDraftOrNew}
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Postavke naročila</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={!isDraftOrNew}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Dodaj postavko
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it) => {
                const q = parseFloat(it.quantity) || 0;
                const c = parseFloat(it.unitCost) || 0;
                const line = q * c;
                return (
                  <Card key={it.key} className="p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                      {/* Inventory select */}
                      <div className="sm:col-span-3">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Inventarni izdelek
                        </Label>
                        <Select
                          value={it.inventoryItemId ?? "none"}
                          onValueChange={(v) => selectInventoryItem(it.key, v)}
                          disabled={!isDraftOrNew}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Prosto besedilo</SelectItem>
                            {inventory.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                {inv.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Name */}
                      <div className="sm:col-span-3">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Ime
                        </Label>
                        <Input
                          value={it.name}
                          onChange={(e) =>
                            updateItem(it.key, { name: e.target.value })
                          }
                          placeholder="npr. Moka tip 500"
                          disabled={!isDraftOrNew}
                          className="h-9"
                        />
                      </div>
                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Količina
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it.key, { quantity: e.target.value })
                          }
                          disabled={!isDraftOrNew}
                          className="h-9"
                        />
                      </div>
                      {/* Unit */}
                      <div className="sm:col-span-1">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Enota
                        </Label>
                        <Select
                          value={it.unit}
                          onValueChange={(v) => updateItem(it.key, { unit: v })}
                          disabled={!isDraftOrNew}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Unit cost */}
                      <div className="sm:col-span-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Cena/€
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.unitCost}
                          onChange={(e) =>
                            updateItem(it.key, { unitCost: e.target.value })
                          }
                          disabled={!isDraftOrNew}
                          className="h-9"
                        />
                      </div>
                      {/* Delete */}
                      <div className="sm:col-span-1 flex sm:justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:text-destructive"
                          onClick={() => removeItem(it.key)}
                          disabled={!isDraftOrNew || items.length === 1}
                          aria-label="Odstrani postavko"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1.5 text-right text-xs text-muted-foreground">
                      Vrstica:{" "}
                      <span className="font-semibold text-foreground">
                        {formatEUR(line)}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vmesna vsota</span>
              <span className="font-medium">{formatEUR(calc.subtotal)}</span>
            </div>
            {calc.disc > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Popust (-{calc.disc}%)
                </span>
                <span className="font-medium text-rose-600">
                  -{formatEUR(calc.discountAmount)}
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Skupaj</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatEUR(calc.total)}
              </span>
            </div>
          </div>

          {!isDraftOrNew && (
            <p className="text-xs text-muted-foreground">
              ⚠️ Urejanje je omejeno — nabavni nalog ni več v osnutku.
              Popust in opomba so še vedno na voljo preko akcij v seznamu.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving
              ? "Shranjujem..."
              : editing
              ? "Posodobi"
              : "Ustvari nalog"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Detail dialog
// ============================================================

function DetailPODialog({
  po,
  onOpenChange,
  onSend,
  onReceive,
  onCancel,
  onEdit,
  onDelete,
}: {
  po: PurchaseOrder | null;
  onOpenChange: (o: boolean) => void;
  onSend: (po: PurchaseOrder) => void;
  onReceive: (po: PurchaseOrder) => void;
  onCancel: (po: PurchaseOrder) => void;
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
}) {
  if (!po) return null;
  const statusMeta = STATUS_META[po.status];
  const subtotal =
    po.items.reduce((s, it) => s + it.lineTotal, 0) || po.totalAmount / (1 - (po.discountPercent || 0) / 100);

  return (
    <Dialog open={!!po} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            {po.poNumber}
            <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Dobavitelj</p>
              <p className="mt-0.5 truncate text-sm font-medium">
                {po.supplier?.name ?? "Brez dobavitelja"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Datum naročila</p>
              <p className="mt-0.5 text-sm font-medium">
                {formatDate(po.orderDate)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Pričakovano</p>
              <p className="mt-0.5 text-sm font-medium">
                {formatDate(po.expectedDate)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Prejeto</p>
              <p className="mt-0.5 text-sm font-medium">
                {formatDate(po.receivedDate)}
              </p>
            </div>
          </div>

          {po.operator && (
            <p className="text-xs text-muted-foreground">
              Operater: <span className="font-medium">{po.operator}</span>
            </p>
          )}

          {/* Items table */}
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/30 px-3 py-2">
              <p className="text-sm font-semibold">
                Postavke ({po.items.length})
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Ime</th>
                    <th className="px-3 py-2 text-right font-medium">Kol.</th>
                    <th className="px-3 py-2 text-left font-medium">En.</th>
                    <th className="px-3 py-2 text-right font-medium">
                      Cena/€
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Vrstica
                    </th>
                    {po.status === "received" && (
                      <th className="px-3 py-2 text-right font-medium">
                        Prejeto
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {po.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2">
                        <span className="font-medium">{it.name}</span>
                        {it.inventoryItemId && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (inventar)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{it.quantity}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {it.unit}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatEUR(it.unitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatEUR(it.lineTotal)}
                      </td>
                      {po.status === "received" && (
                        <td className="px-3 py-2 text-right text-emerald-600">
                          {it.receivedQty}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vmesna vsota</span>
              <span>{formatEUR(subtotal)}</span>
            </div>
            {po.discountPercent > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Popust (-{po.discountPercent}%)
                </span>
                <span className="text-rose-600">
                  -{formatEUR(subtotal - po.totalAmount)}
                </span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Skupaj</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatEUR(po.totalAmount)}
              </span>
            </div>
          </div>

          {po.note && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Opomba
              </p>
              <p className="mt-1 text-sm">{po.note}</p>
            </div>
          )}

          {/* Workflow actions */}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {po.status === "draft" && (
              <>
                <Button onClick={() => onSend(po)} className="bg-sky-600 hover:bg-sky-700">
                  <Send className="mr-1.5 h-4 w-4" />
                  Pošlji dobavitelju
                </Button>
                <Button variant="outline" onClick={() => onEdit(po)}>
                  <Edit className="mr-1.5 h-4 w-4" />
                  Uredi
                </Button>
                <Button
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => onCancel(po)}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Prekliči
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={() => onDelete(po)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Izbriši
                </Button>
              </>
            )}
            {po.status === "sent" && (
              <>
                <Button
                  onClick={() => onReceive(po)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Označi kot prejeto
                </Button>
                <Button
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => onCancel(po)}
                >
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Prekliči
                </Button>
              </>
            )}
            {po.status === "received" && (
              <div className="flex w-full items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  Nabavni nalog je bil prejet {formatDate(po.receivedDate)}.
                  Zaloga in cene inventarja so bile posodobljene.
                </span>
              </div>
            )}
            {po.status === "cancelled" && (
              <div className="flex w-full items-center gap-2 text-sm text-rose-600">
                <XCircle className="h-5 w-5" />
                <span>
                  Nabavni nalog je preklican in ni več aktiven.
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
