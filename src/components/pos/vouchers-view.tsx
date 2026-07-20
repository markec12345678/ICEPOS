"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Ticket,
  Plus,
  Trash2,
  Edit,
  Percent,
  Euro,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Copy,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  usedCount: number;
  categories: string;
  menuItemIds: string;
  active: boolean;
  note: string | null;
  isExpired: boolean;
  isExhausted: boolean;
  remainingUses: number | null;
}

interface Summary {
  total: number;
  active: number;
  expired: number;
  totalUsed: number;
  totalSavings: number;
}

interface VouchersData {
  vouchers: Voucher[];
  summary: Summary;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Percent }
> = {
  percent: { label: "Odstotek", icon: Percent },
  fixed: { label: "Fiksni znesek", icon: Euro },
  item_free: { label: "Brezplačna jed", icon: Ticket },
  buy_x_get_y: { label: "Buy X Get Y", icon: Ticket },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

export function VouchersView() {
  const [data, setData] = useState<VouchersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Voucher | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "percent",
    value: 10,
    minOrderValue: 0,
    maxDiscount: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== "all") params.set("active", activeFilter);
      const url = `/api/vouchers${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju vavčerjev");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: Voucher) {
    setEditItem(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      type: item.type,
      value: item.value,
      minOrderValue: item.minOrderValue,
      maxDiscount: item.maxDiscount?.toString() || "",
      validFrom: item.validFrom?.slice(0, 10) || "",
      validUntil: item.validUntil?.slice(0, 10) || "",
      usageLimit: item.usageLimit?.toString() || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      code: "",
      name: "",
      description: "",
      type: "percent",
      value: 10,
      minOrderValue: 0,
      maxDiscount: "",
      validFrom: "",
      validUntil: "",
      usageLimit: "",
      note: "",
    });
    setEditItem(null);
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setForm({ ...form, code });
  }

  async function saveVoucher() {
    if (!form.code || !form.name) {
      toast.error("Koda in ime sta obvezna");
      return;
    }
    try {
      const payload = {
        ...form,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      };
      const url = editItem ? `/api/vouchers/${editItem.id}` : "/api/vouchers";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Vavčer posodobljen" : "✓ Vavčer ustvarjen");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteVoucher(id: string) {
    if (!confirm("Ali res želiš izbrisati ta vavčer?")) return;
    try {
      const res = await fetch(`/api/vouchers/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Vavčer izbrisan");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  async function toggleActive(item: Voucher) {
    try {
      const res = await fetch(`/api/vouchers/${item.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success(item.active ? "✓ Vavčer deaktiviran" : "✓ Vavčer aktiviran");
      await loadData();
    } catch {
      toast.error("Napaka pri posodabljanju");
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`✓ Koda ${code} kopirana`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Vavčerji in popusti</h2>
          <p className="text-sm text-muted-foreground">Upravljanje kuponov in popustov</p>
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
            <Ticket className="h-6 w-6 text-purple-600" />
            Vavčerji in popusti
          </h2>
          <p className="text-sm text-muted-foreground">
            Upravljanje kuponov, popustov in promocijskih kod
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov vavčer
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <Ticket className="h-8 w-8 text-purple-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Aktivni</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.active}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj uporab</p>
              <p className="text-2xl font-bold">{s.totalUsed}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupni popust</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalSavings)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Select value={activeFilter} onValueChange={setActiveFilter}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsi</SelectItem>
          <SelectItem value="true">Samo aktivni</SelectItem>
          <SelectItem value="false">Samo neaktivni</SelectItem>
        </SelectContent>
      </Select>

      {/* Seznam vavčerjev */}
      {data.vouchers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Ni vavčerjev"
          description="Dodaj prvi vavčer z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.vouchers.map((v) => {
            const typeCfg = TYPE_CONFIG[v.type] || TYPE_CONFIG.percent;
            const TypeIcon = typeCfg.icon;
            return (
              <Card key={v.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
                      <TypeIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{v.name}</h4>
                      <p className="text-xs text-muted-foreground">{typeCfg.label}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(v)}>
                    <Badge
                      variant="outline"
                      className={
                        v.active && !v.isExpired && !v.isExhausted
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : "border-muted bg-muted/50 text-muted-foreground"
                      }
                    >
                      {v.isExpired ? "Potekel" : v.isExhausted ? "Porabljen" : v.active ? "Aktiven" : "Neaktivno"}
                    </Badge>
                  </button>
                </div>

                {/* Koda */}
                <div className="mb-2 flex items-center justify-between rounded border bg-muted/20 p-2">
                  <code className="font-mono text-lg font-bold text-purple-600">{v.code}</code>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(v.code)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Vrednost */}
                <div className="mb-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Popust:</span>
                    <span className="font-bold text-amber-600">
                      {v.type === "percent"
                        ? `-${v.value}%`
                        : v.type === "fixed"
                        ? `-${formatEUR(v.value)}`
                        : TYPE_CONFIG[v.type]?.label}
                    </span>
                  </div>
                  {v.minOrderValue > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Min. naročilo:</span>
                      <span>{formatEUR(v.minOrderValue)}</span>
                    </div>
                  )}
                  {v.maxDiscount && v.type === "percent" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Max popust:</span>
                      <span>{formatEUR(v.maxDiscount)}</span>
                    </div>
                  )}
                </div>

                {/* Uporabe */}
                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Uporabljeno:</span>
                    <span className="font-medium">
                      {v.usedCount}
                      {v.usageLimit ? ` / ${v.usageLimit}` : " (neomejeno)"}
                    </span>
                  </div>
                  {v.remainingUses !== null && v.remainingUses > 0 && (
                    <div className="flex justify-between">
                      <span>Preostalo:</span>
                      <span className="font-medium text-emerald-600">{v.remainingUses}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Veljavnost:</span>
                    <span>
                      {formatDate(v.validFrom)} – {formatDate(v.validUntil)}
                    </span>
                  </div>
                </div>

                {/* Progress bar za usage */}
                {v.usageLimit && (
                  <div className="mb-3">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${Math.min(100, (v.usedCount / v.usageLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Akcije */}
                <div className="mt-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteVoucher(v.id)}
                    className="text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi vavčer" : "Nov vavčer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Koda *</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="POLETJE20"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Generiraj
                </Button>
              </div>
            </div>
            <div>
              <Label>Ime *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Poletni popust 20%"
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tip</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vrednost *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {form.type === "percent" ? "Odstotek (%)" : "Znesek (€)"}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. naročilo (€)</Label>
                <Input
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => setForm({ ...form, minOrderValue: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Max popust (€)</Label>
                <Input
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="samo za %"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Veljaven od</Label>
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Veljaven do</Label>
                <Input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Max št. uporab (prazno = neomejeno)</Label>
              <Input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="100"
              />
            </div>
            <div>
              <Label>Opomba</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Prekliči</Button>
            <Button onClick={saveVoucher} className="bg-purple-600 hover:bg-purple-700">
              {editItem ? "Shrani" : "Ustvari"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
