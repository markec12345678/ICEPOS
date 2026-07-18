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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Trash2,
  Edit,
  Phone,
  Mail,
  MapPin,
  Search,
  User,
  Percent,
  FileText,
  Users,
  CheckCircle2,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";
import { useUndo } from "@/hooks/use-undo";

interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  taxNumber: string | null;
  paymentTerms: string;
  discountPercent: number;
  note: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const PAYMENT_TERMS = [
  "14 dni",
  "30 dni",
  "60 dni",
  "90 dni",
  "plačilo po prevzemu",
];

export function SupplierView() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const { confirmDestructive } = useUndo();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      setSuppliers(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju dobaviteljev");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // KPI izračuni (memoizirano)
  const kpis = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.active).length;
    const avgDiscount =
      total > 0
        ? suppliers.reduce((sum, s) => sum + (s.discountPercent || 0), 0) / total
        : 0;
    const withContact = suppliers.filter(
      (s) => (s.phone && s.phone.trim()) || (s.email && s.email.trim())
    ).length;
    return { total, active, avgDiscount, withContact };
  }, [suppliers]);

  // Filter po iskanju (ime, mesto, kontaktna oseba)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        (s.city?.toLowerCase().includes(q) ?? false) ||
        (s.contactPerson?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [suppliers, search]);

  async function toggleActive(s: Supplier) {
    try {
      const res = await fetch(`/api/suppliers/${s.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !s.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Napaka");
      }
      toast.success(s.active ? "Dobavitelj onemogočen" : "Dobavitelj omogočen");
      load();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri posodobitvi");
    }
  }

  function handleDelete(s: Supplier) {
    confirmDestructive(
      `Izbriši dobavitelja "${s.name}"?`,
      "Dejanja ni mogoče razveljaviti.",
      async () => {
        try {
          const res = await fetch(`/api/suppliers/${s.id}`, {
            method: "DELETE",
            headers: authHeaders(),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Napaka");
          }
          toast.success("Dobavitelj izbrisan");
          load();
        } catch (e) {
          toast.error((e as Error).message || "Napaka pri brisanju");
        }
      },
      { confirmLabel: "Izbriši", cancelLabel: "Prekliči" }
    );
  }

  if (loading) {
    return <LoadingSpinner label="Nalagam dobavitelje..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Truck className="h-6 w-6 text-amber-600" />
            Dobavitelji
          </h2>
          <p className="text-sm text-muted-foreground">
            Upravljanje dobaviteljev in kontaktnih podatkov
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setEditOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nov dobavitelj
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Truck className="h-4 w-4" />}
          label="Skupaj dobaviteljev"
          value={String(kpis.total)}
          accent="amber"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Aktivni"
          value={String(kpis.active)}
          accent="emerald"
        />
        <KpiCard
          icon={<Percent className="h-4 w-4" />}
          label="Povprečni rabat %"
          value={`${kpis.avgDiscount.toFixed(1)} %`}
          accent="amber"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Skupni kontakti"
          value={String(kpis.withContact)}
          accent="emerald"
        />
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Iskanje po imenu, mestu ali kontaktni osebi..."
          className="pl-9"
        />
      </div>

      {/* Supplier list */}
      {filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={Truck}
            title={suppliers.length === 0 ? "Ni dobaviteljev" : "Ni rezultatov iskanja"}
            description={
              suppliers.length === 0
                ? "Dodaj prvega dobavitelja za upravljanje nabave in kontaktov."
                : "Poskusi z drugačno iskalno frazo."
            }
            action={
              suppliers.length === 0
                ? { label: "Nov dobavitelj", onClick: () => { setEditing(null); setEditOpen(true); } }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className={`flex flex-col p-4 ${!s.active ? "opacity-60" : ""}`}>
              {/* Top: name + active badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">{s.name}</h3>
                    {s.active ? (
                      <Badge className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Aktiven
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Neaktiven
                      </Badge>
                    )}
                  </div>
                  {s.contactPerson && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {s.contactPerson}
                    </p>
                  )}
                </div>
                {s.discountPercent > 0 && (
                  <div className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    -{s.discountPercent}%
                  </div>
                )}
              </div>

              {/* Contact details */}
              <div className="mt-3 flex-1 space-y-1.5 text-sm">
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.phone}</span>
                  </a>
                )}
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </a>
                )}
                {(s.address || s.city) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {[s.address, s.city].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>{s.paymentTerms}</span>
                  {s.taxNumber && (
                    <span className="ml-auto text-xs text-muted-foreground/80">
                      ID za DDV: {s.taxNumber}
                    </span>
                  )}
                </div>
                {s.note && (
                  <p className="mt-2 line-clamp-2 rounded-md bg-muted/40 p-2 text-xs italic text-muted-foreground">
                    {s.note}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.active}
                    onCheckedChange={() => toggleActive(s)}
                    aria-label="Aktiviraj/onemogoči dobavitelja"
                  />
                  <span className="text-xs text-muted-foreground">
                    {s.active ? "Aktiven" : "Neaktiven"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditing(s); setEditOpen(true); }}
                    aria-label="Uredi dobavitelja"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(s)}
                    aria-label="Izbriši dobavitelja"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SupplierDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        onSaved={load}
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
  accent: "amber" | "emerald";
}) {
  const accentClasses =
    accent === "amber"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accentClasses}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

// ============================================================
// Dialog za dodajanje/urejanje dobavitelja
// ============================================================

function SupplierDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Supplier | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30 dni");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setContactPerson(editing.contactPerson || "");
        setPhone(editing.phone || "");
        setEmail(editing.email || "");
        setAddress(editing.address || "");
        setCity(editing.city || "");
        setTaxNumber(editing.taxNumber || "");
        setPaymentTerms(editing.paymentTerms || "30 dni");
        setDiscountPercent(String(editing.discountPercent ?? 0));
        setNote(editing.note || "");
        setActive(editing.active);
      } else {
        setName("");
        setContactPerson("");
        setPhone("");
        setEmail("");
        setAddress("");
        setCity("");
        setTaxNumber("");
        setPaymentTerms("30 dni");
        setDiscountPercent("0");
        setNote("");
        setActive(true);
      }
    }
  }, [open, editing]);

  async function save() {
    if (!name.trim()) {
      toast.error("Ime dobavitelja je obvezno");
      return;
    }
    // Osnoben email format check
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Neveljaven email naslov");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        taxNumber: taxNumber.trim(),
        paymentTerms,
        discountPercent: parseFloat(discountPercent) || 0,
        note: note.trim(),
        active,
      };

      const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Napaka");
      }
      toast.success(editing ? "Dobavitelj posodobljen" : "Dobavitelj ustvarjen");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  // Predogled letnega prihranka z rabatom (informacijsko)
  const discountValue = parseFloat(discountPercent) || 0;
  const exampleSaving = discountValue > 0 ? formatEUR(1000 * discountValue / 100) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Uredi dobavitelja" : "Nov dobavitelj"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Ime + aktivna */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="sup-name" className="mb-1.5 block text-sm">
                Ime <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Mlekarna Celeia, Hofmann d.o.o...."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sup-contact" className="mb-1.5 block text-sm">
                Kontaktna oseba
              </Label>
              <Input
                id="sup-contact"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="npr. Janez Novak"
              />
            </div>
            <div>
              <Label htmlFor="sup-tax" className="mb-1.5 block text-sm">
                Davčna št.
              </Label>
              <Input
                id="sup-tax"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="SI12345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sup-phone" className="mb-1.5 block text-sm">
                Telefon
              </Label>
              <Input
                id="sup-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+386 1 234 56 78"
              />
            </div>
            <div>
              <Label htmlFor="sup-email" className="mb-1.5 block text-sm">
                Email
              </Label>
              <Input
                id="sup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nabava@dobavitelj.si"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sup-address" className="mb-1.5 block text-sm">
                Naslov
              </Label>
              <Input
                id="sup-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ulica in številka"
              />
            </div>
            <div>
              <Label htmlFor="sup-city" className="mb-1.5 block text-sm">
                Mesto
              </Label>
              <Input
                id="sup-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="npr. Ljubljana"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-sm">Plačilni pogoji</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sup-discount" className="mb-1.5 block text-sm">
                Rabat %
              </Label>
              <Input
                id="sup-discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
              {exampleSaving && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Pri 1.000 € nabave prihranite {exampleSaving}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="sup-note" className="mb-1.5 block text-sm">
              Opomba
            </Label>
            <Textarea
              id="sup-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Npr. dobavni roki, posebni pogoji, kontakt za nujne primere..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="sup-active" className="text-sm font-medium">
                Aktivna
              </Label>
              <p className="text-xs text-muted-foreground">
                Neaktivni dobavitelji so vidni, a niso na voljo za novo nabavo.
              </p>
            </div>
            <Switch
              id="sup-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
