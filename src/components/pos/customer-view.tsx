"use client";

import { useEffect, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, formatDateTime } from "@/lib/types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertCircle,
  Users,
  Trophy,
  Euro,
  Star,
  Phone,
  Mail,
  StickyNote,
  Crown,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/components/pos/pin-login";

interface CustomerOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  paidAt: string | null;
  paymentMethod: string | null;
  receiptNo: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  totalSpent: number;
  visitCount: number;
  allergens: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: CustomerOrder[];
}

interface CustomerDetail extends Customer {
  orders: Array<
    CustomerOrder & {
      table: { id: string; number: number; name: string } | null;
      items: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        menuItem: { id: string; name: string };
      }>;
    }
  >;
}

export function CustomerView() {
  const { data, loading, error, refetch } = useFetch<Customer[]>(
    "/api/customers"
  );
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const customers = data || [];
  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  const totalCustomers = customers.length;
  const topCustomer = customers[0] || null; // sorted by totalSpent desc
  const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);
  const totalPoints = customers.reduce((s, c) => s + c.points, 0);

  async function saveCustomer(item: Partial<Customer> & { id?: string }) {
    try {
      if (item.id) {
        const res = await fetch(`/api/customers/${item.id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Napaka");
        }
        toast.success("Stranka posodobljena");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(item),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Napaka");
        }
        toast.success("Stranka dodana");
      }
      setEditing(null);
      setCreating(false);
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri shranjevanju");
    }
  }

  async function deleteCustomer(item: Customer) {
    try {
      const res = await fetch(`/api/customers/${item.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Napaka");
      }
      toast.success(`"${item.name}" izbrisana`);
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
          Napaka pri nalaganju strank.
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Skupaj strank"
          value={String(totalCustomers)}
          icon={Users}
          accent="neutral"
        />
        <StatCard
          label="Top stranka"
          value={topCustomer ? topCustomer.name.split(" ")[0] : "—"}
          icon={Crown}
          accent="amber"
        />
        <StatCard
          label="Skupna poraba"
          value={formatEUR(totalSpent)}
          icon={Euro}
          accent="emerald"
        />
        <StatCard
          label="Skupaj točk"
          value={String(totalPoints)}
          icon={Star}
          accent="rose"
        />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Stranke</h2>
          <p className="text-xs text-muted-foreground">
            CRM in program zvestobe &middot; {totalCustomers} strank
          </p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nova stranka
        </Button>
      </div>

      {/* Iskalnik */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Išči po imenu ali telefonu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Seznam strank */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {customers.length === 0 ? "Ni strank" : "Ni najdenih strank"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customers.length === 0
                ? "Dodajte prvo stranko da začnete s programom zvestobe."
                : "Poskusite spremeniti iskalni niz."}
            </p>
          </div>
          {customers.length === 0 || search.trim() ? (
            <Button
              onClick={() => setCreating(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Nova stranka
            </Button>
          ) : null}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="pl-4">Ime</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="text-right">Točke</TableHead>
                <TableHead className="text-right">Skupna poraba</TableHead>
                <TableHead className="text-center">Obiski</TableHead>
                <TableHead className="pr-4 text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c, idx) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-muted/40"
                  onClick={() => setDetailId(c.id)}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      {idx === 0 && customers.length > 1 && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium">{c.name}</p>
                        {c.note && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phone || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      <Star className="mr-1 h-3 w-3" />
                      {c.points}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatEUR(c.totalSpent)}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">
                    {c.visitCount}
                  </TableCell>
                  <TableCell
                    className="pr-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog: urejanje/ustvarjanje */}
      {(editing || creating) && (
        <CustomerDialog
          customer={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSave={saveCustomer}
        />
      )}

      {/* Dialog: podrobnosti */}
      {detailId && (
        <CustomerDetailDialog
          id={detailId}
          onClose={() => setDetailId(null)}
          onEdit={(c) => {
            setDetailId(null);
            setEditing(c);
          }}
        />
      )}

      {/* Dialog: brisanje */}
      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-rose-600">Izbriši stranko</DialogTitle>
              <DialogDescription>
                Ali res želiš izbrisati <strong>{deleting.name}</strong>?
                Zgodovina naročil ostane, vendar povezava s stranko bo
                izgubljena.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Prekliči
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700"
                onClick={() => deleteCustomer(deleting)}
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
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "emerald" | "amber" | "neutral" | "rose";
}) {
  const accentClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    neutral: "bg-muted text-foreground",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400",
  };
  return (
    <Card className="p-4">
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
      <p className="mt-2 truncate text-2xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function CustomerDialog({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSave: (data: Partial<Customer> & { id?: string }) => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [note, setNote] = useState(customer?.note || "");

  function submit() {
    if (!name.trim()) {
      toast.error("Ime je obvezno");
      return;
    }
    onSave({
      id: customer?.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      note: note.trim() || null,
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            {customer ? "Uredi stranko" : "Nova stranka"}
          </DialogTitle>
          <DialogDescription>
            {customer ? customer.name : "Dodaj novo stranko v bazo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="cname">Ime in priimek</Label>
            <Input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Ana Novak"
            />
          </div>
          <div>
            <Label htmlFor="cphone">Telefon</Label>
            <Input
              id="cphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="npr. 031 234 567"
            />
          </div>
          <div>
            <Label htmlFor="cemail">E-pošta (opcijsko)</Label>
            <Input
              id="cemail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="npr. ana@example.com"
            />
          </div>
          <div>
            <Label htmlFor="cnote">Opomba (alergije, preference)</Label>
            <Input
              id="cnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. Alergična na gluten, pogosti gost"
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
            {customer ? "Shrani spremembe" : "Dodaj stranko"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailDialog({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (c: Customer) => void;
}) {
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          toast.error("Napaka pri nalaganju stranke");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-600" />
            {data?.name || "Nalagam..."}
          </DialogTitle>
          <DialogDescription>
            Podrobnosti stranke in zadnjih 20 naročil
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Osnovni podatki */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailStat
                label="Točke"
                value={String(data.points)}
                icon={Star}
              />
              <DetailStat
                label="Poraba"
                value={formatEUR(data.totalSpent)}
                icon={Euro}
              />
              <DetailStat
                label="Obiski"
                value={String(data.visitCount)}
                icon={Receipt}
              />
              <DetailStat
                label="Povprečno"
                value={
                  data.visitCount > 0
                    ? formatEUR(data.totalSpent / data.visitCount)
                    : formatEUR(0)
                }
                icon={Trophy}
              />
            </div>

            {/* Kontakt */}
            <Card className="p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Telefon:</span>
                  <span>{data.phone || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">E-pošta:</span>
                  <span className="truncate">{data.email || "—"}</span>
                </div>
                {data.note && (
                  <div className="col-span-1 flex items-start gap-2 text-sm sm:col-span-2">
                    <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Opomba:</span>
                    <span>{data.note}</span>
                  </div>
                )}
              </div>
            </Card>

            <Separator />

            {/* Zadnja naročila */}
            <div>
              <p className="mb-2 text-sm font-semibold">
                Zadnja naročila ({data.orders?.length || 0})
              </p>
              <ScrollArea className="h-64 rounded-lg border border-border">
                {data.orders && data.orders.length > 0 ? (
                  <div className="divide-y divide-border">
                    {data.orders.map((o) => (
                      <div key={o.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {o.receiptNo
                                ? `Račun ${o.receiptNo}`
                                : "Naročilo"}{" "}
                              {o.table && (
                                <span className="text-muted-foreground">
                                  · Miza {o.table.number}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(o.createdAt)} ·{" "}
                              {o.paymentMethod === "card"
                                ? "Kartica"
                                : o.paymentMethod === "cash"
                                ? "Gotovina"
                                : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold tabular-nums">
                              {formatEUR(o.total)}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                o.status === "paid" &&
                                  "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
                                o.status === "storno" &&
                                  "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                              )}
                            >
                              {o.status === "paid"
                                ? "Plačano"
                                : o.status === "storno"
                                ? "Storno"
                                : o.status === "cancelled"
                                ? "Preklicano"
                                : "Odprto"}
                            </Badge>
                          </div>
                        </div>
                        {o.items && o.items.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {o.items.map((it) => (
                              <span
                                key={it.id}
                                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {it.quantity}× {it.menuItem.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
                    Ni najdenih naročil.
                  </div>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Zapri
              </Button>
              <Button
                onClick={() => onEdit(data)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Uredi
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 truncate text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
