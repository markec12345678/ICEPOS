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
  Calendar,
  Plus,
  Trash2,
  Edit,
  Users,
  Euro,
  MapPin,
  Cake,
  Building2,
  Heart,
  Briefcase,
  User,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface EventItem {
  id: string;
  title: string;
  type: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  eventDate: string;
  endDate: string | null;
  setupTime: string | null;
  guestCount: number;
  location: string | null;
  isOffsite: boolean;
  offsiteAddress: string | null;
  packagePrice: number;
  pricePerGuest: number;
  totalQuoted: number;
  depositPaid: number;
  balance: number;
  status: string;
  menu: string | null;
  requirements: string | null;
  note: string | null;
  assignedOperator: string | null;
}

interface Summary {
  total: number;
  upcoming: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  totalGuests: number;
  totalRevenue: number;
  pendingDeposits: number;
}

interface EventsData {
  events: EventItem[];
  summary: Summary;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Cake }> = {
  wedding: { label: "Poroka", icon: Heart },
  corporate: { label: "Poslovni", icon: Briefcase },
  birthday: { label: "Rojsni dan", icon: Cake },
  conference: { label: "Konferenca", icon: Building2 },
  private: { label: "Zasebni", icon: User },
  other: { label: "Drugo", icon: Package },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  inquiry: {
    label: "Povpraševanje",
    icon: Clock,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  quoted: {
    label: "Ponudba poslana",
    icon: Clock,
    className:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  },
  confirmed: {
    label: "Potrjeno",
    icon: CheckCircle2,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  deposit: {
    label: "Depozit plačan",
    icon: CheckCircle2,
    className:
      "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  completed: {
    label: "Zaključeno",
    icon: CheckCircle2,
    className:
      "border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  cancelled: {
    label: "Preklicano",
    icon: XCircle,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventsView() {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventItem | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "corporate",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    eventDate: new Date().toISOString().slice(0, 10),
    setupTime: "",
    guestCount: 0,
    location: "",
    isOffsite: false,
    offsiteAddress: "",
    packagePrice: 0,
    pricePerGuest: 0,
    depositPaid: 0,
    status: "inquiry",
    menu: "",
    requirements: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = `/api/events${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju dogodkov");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: EventItem) {
    setEditItem(item);
    setForm({
      title: item.title,
      type: item.type,
      customerName: item.customerName,
      customerPhone: item.customerPhone || "",
      customerEmail: item.customerEmail || "",
      eventDate: item.eventDate.slice(0, 10),
      setupTime: item.setupTime || "",
      guestCount: item.guestCount,
      location: item.location || "",
      isOffsite: item.isOffsite,
      offsiteAddress: item.offsiteAddress || "",
      packagePrice: item.packagePrice,
      pricePerGuest: item.pricePerGuest,
      depositPaid: item.depositPaid,
      status: item.status,
      menu: item.menu || "",
      requirements: item.requirements || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      title: "",
      type: "corporate",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      eventDate: new Date().toISOString().slice(0, 10),
      setupTime: "",
      guestCount: 0,
      location: "",
      isOffsite: false,
      offsiteAddress: "",
      packagePrice: 0,
      pricePerGuest: 0,
      depositPaid: 0,
      status: "inquiry",
      menu: "",
      requirements: "",
      note: "",
    });
    setEditItem(null);
  }

  function getCalculatedTotal() {
    return (form.packagePrice || 0) + (form.guestCount || 0) * (form.pricePerGuest || 0);
  }

  async function saveEvent() {
    if (!form.title || !form.customerName) {
      toast.error("Naslov in ime stranke sta obvezna");
      return;
    }
    try {
      const url = editItem ? `/api/events/${editItem.id}` : "/api/events";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Dogodek posodobljen" : "✓ Dogodek ustvarjen");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Ali res želiš izbrisati ta dogodek?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Dogodek izbrisan");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success("✓ Status posodobljen");
      await loadData();
    } catch {
      toast.error("Napaka pri posodabljanju statusa");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Dogodki in catering</h2>
          <p className="text-sm text-muted-foreground">Organizacija dogodkov</p>
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
            <Calendar className="h-6 w-6 text-purple-600" />
            Dogodki in catering
          </h2>
          <p className="text-sm text-muted-foreground">
            Organizacija dogodkov, catering in upravljanje rezervacij
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
          Nov dogodek
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
            <Calendar className="h-8 w-8 text-purple-600/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Prihajajoči</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.upcoming}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">{s.totalGuests} gostov</p>
            </div>
            <Clock className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Prihodek</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatEUR(s.totalRevenue)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Čakajoči depoziti
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {formatEUR(s.pendingDeposits)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsi statusi</SelectItem>
          <SelectItem value="inquiry">Povpraševanje</SelectItem>
          <SelectItem value="quoted">Ponudba poslana</SelectItem>
          <SelectItem value="confirmed">Potrjeno</SelectItem>
          <SelectItem value="deposit">Depozit plačan</SelectItem>
          <SelectItem value="completed">Zaključeno</SelectItem>
          <SelectItem value="cancelled">Preklicano</SelectItem>
        </SelectContent>
      </Select>

      {/* Seznam dogodkov */}
      {data.events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Ni dogodkov"
          description="Dodaj prvi dogodek z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event) => {
            const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.other;
            const TypeIcon = typeCfg.icon;
            const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.inquiry;
            const StatusIcon = statusCfg.icon;
            return (
              <Card key={event.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
                      <TypeIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-xs text-muted-foreground">{typeCfg.label}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusCfg.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.customerName}
                  </p>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(event.eventDate)}
                    {event.setupTime && ` · priprava ${event.setupTime}`}
                  </p>
                  <p className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {event.guestCount} gostov
                  </p>
                  {event.isOffsite ? (
                    <p className="flex items-center gap-1 text-purple-600">
                      <MapPin className="h-3 w-3" />
                      Catering: {event.offsiteAddress || event.location || "Zunanja lokacija"}
                    </p>
                  ) : (
                    event.location && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )
                  )}
                </div>

                {/* Finance */}
                <div className="mb-3 rounded border bg-muted/20 p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Skupaj:</span>
                    <span className="font-bold">{formatEUR(event.totalQuoted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depozit:</span>
                    <span className="text-emerald-600">{formatEUR(event.depositPaid)}</span>
                  </div>
                  {event.balance > 0 && (
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-muted-foreground">Preostalo:</span>
                      <span className="font-bold text-rose-600">{formatEUR(event.balance)}</span>
                    </div>
                  )}
                </div>

                {/* Akcije */}
                <div className="mt-auto flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(event)}>
                    <Edit className="mr-1 h-3 w-3" />
                    Uredi
                  </Button>
                  {event.status === "inquiry" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(event.id, "quoted")}>
                      Pošlji ponudbo
                    </Button>
                  )}
                  {event.status === "quoted" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(event.id, "confirmed")}>
                      Potrdi
                    </Button>
                  )}
                  {event.status === "confirmed" && (
                    <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus(event.id, "deposit")}>
                      Depozit
                    </Button>
                  )}
                  {event.status === "deposit" && (
                    <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateStatus(event.id, "completed")}>
                      Zaključi
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteEvent(event.id)}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi dogodek" : "Nov dogodek"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Naslov *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="npr. Poroka Marko in Ana"
                />
              </div>
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stranka *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label>Datum dogodka *</Label>
                <Input
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Čas priprave</Label>
                <Input
                  type="time"
                  value={form.setupTime}
                  onChange={(e) => setForm({ ...form, setupTime: e.target.value })}
                />
              </div>
              <div>
                <Label>Št. gostov</Label>
                <Input
                  type="number"
                  value={form.guestCount}
                  onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Lokacija */}
            <div className="rounded border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label>Lokacija</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Catering zunaj</span>
                  <Switch
                    checked={form.isOffsite}
                    onCheckedChange={(checked) => setForm({ ...form, isOffsite: checked })}
                  />
                </div>
              </div>
              {form.isOffsite ? (
                <Input
                  value={form.offsiteAddress}
                  onChange={(e) => setForm({ ...form, offsiteAddress: e.target.value })}
                  placeholder="Naslov zunanjega cateringa"
                />
              ) : (
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="npr. Dvorana Pri Marku"
                />
              )}
            </div>

            {/* Cene */}
            <div className="rounded border bg-muted/20 p-3">
              <Label>Cene</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cena paketa (€)</Label>
                  <Input
                    type="number"
                    value={form.packagePrice}
                    onChange={(e) => setForm({ ...form, packagePrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cena/gost (€)</Label>
                  <Input
                    type="number"
                    value={form.pricePerGuest}
                    onChange={(e) => setForm({ ...form, pricePerGuest: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Depozit (€)</Label>
                  <Input
                    type="number"
                    value={form.depositPaid}
                    onChange={(e) => setForm({ ...form, depositPaid: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full rounded border bg-background p-2 text-center">
                    <p className="text-xs text-muted-foreground">Skupaj</p>
                    <p className="font-bold text-purple-600">{formatEUR(getCalculatedTotal())}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Meni</Label>
              <Textarea
                value={form.menu}
                onChange={(e) => setForm({ ...form, menu: e.target.value })}
                rows={2}
                placeholder="Opis menija za dogodek..."
              />
            </div>
            <div>
              <Label>Posebne zahteve</Label>
              <Textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={2}
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
            <Button onClick={saveEvent} className="bg-purple-600 hover:bg-purple-700">
              {editItem ? "Shrani" : "Ustvari"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
