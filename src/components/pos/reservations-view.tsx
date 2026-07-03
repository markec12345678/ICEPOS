"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatDateTime } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  CalendarDays,
  Plus,
  Phone,
  Users,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  UserCheck,
  AlertCircle,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NoShowStats } from "@/components/pos/no-show-stats";

interface Reservation {
  id: string;
  tableId: string;
  table: { id: string; name: string; number: number; seats: number };
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  date: string;
  time: string;
  duration: number;
  status: "confirmed" | "seated" | "cancelled" | "no_show";
  note: string | null;
  createdAt: string;
}

interface Table {
  id: string;
  name: string;
  number: number;
  seats: number;
  section: string;
}

export function ReservationsView() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data, loading, error, refetch } = useFetch<Reservation[]>(
    `/api/reservations?date=${date}`
  );
  const { data: tables } = useFetch<Table[]>("/api/tables");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const reservations = data || [];

  function statusBadge(status: Reservation["status"]) {
    const map = {
      confirmed: { label: "Potrjena", cls: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400", icon: Clock },
      seated: { label: "Sedi", cls: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400", icon: UserCheck },
      cancelled: { label: "Preklicana", cls: "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400", icon: XCircle },
      no_show: { label: "Ni prišel", cls: "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400", icon: AlertCircle },
    };
    const cfg = map[status];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={cn("gap-1", cfg.cls)}>
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  }

  async function updateStatus(id: string, status: Reservation["status"]) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success("Status posodobljen");
      refetch();
    } catch {
      toast.error("Napaka pri posodabljanju");
    }
  }

  async function deleteReservation(id: string) {
    if (!confirm("Brisanje rezervacije?")) return;
    try {
      await fetch(`/api/reservations/${id}`, { method: "DELETE" });
      toast.success("Rezervacija izbrisana");
      refetch();
    } catch {
      toast.error("Napaka pri brisanju");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Rezervacije</h2>
          <p className="text-xs text-muted-foreground">
            Upravljanje rezervacij miz
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[180px] pl-9"
            />
          </div>
          <Button onClick={() => setCreating(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Skupaj</p>
          <p className="mt-1 text-2xl font-bold">{reservations.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Potrjene</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {reservations.filter((r) => r.status === "confirmed").length}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Sede</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {reservations.filter((r) => r.status === "seated").length}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Oseb skupaj</p>
          <p className="mt-1 text-2xl font-bold">
            {reservations
              .filter((r) => r.status === "confirmed" || r.status === "seated")
              .reduce((s, r) => s + r.partySize, 0)}
          </p>
        </Card>
      </div>

      {/* Seznam */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ni rezervacij za {date}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ustvari novo rezervacijo z gumbem zgoraj.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {reservations
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <span className="text-lg font-bold">{r.time.split(":")[0]}</span>
                      <span className="text-[10px] -mt-1">:{r.time.split(":")[1]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{r.customerName}</h4>
                        {statusBadge(r.status)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.partySize} oseb
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {r.table.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.duration}min
                        </span>
                        {r.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {r.customerPhone}
                          </span>
                        )}
                      </div>
                      {r.note && (
                        <p className="mt-1.5 flex items-start gap-1 text-xs italic text-amber-700 dark:text-amber-400">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                          {r.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {r.status === "confirmed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        onClick={() => updateStatus(r.id, "seated")}
                      >
                        <UserCheck className="mr-1 h-3.5 w-3.5" />
                        Sedi
                      </Button>
                    )}
                    {r.status !== "cancelled" && r.status !== "no_show" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => updateStatus(r.id, "cancelled")}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        Prekliči
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditing(r)}
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => deleteReservation(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      {(creating || editing) && (
        <ReservationDialog
          reservation={editing}
          tables={tables || []}
          defaultDate={date}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refetch();
          }}
        />
      )}

      {/* No-show statistika */}
      <NoShowStats />
    </div>
  );
}

function ReservationDialog({
  reservation,
  tables,
  defaultDate,
  onClose,
  onSaved,
}: {
  reservation: Reservation | null;
  tables: Table[];
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customerName, setCustomerName] = useState(reservation?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(reservation?.customerPhone || "");
  const [partySize, setPartySize] = useState(String(reservation?.partySize || 2));
  const [date, setDate] = useState(reservation?.date || defaultDate);
  const [time, setTime] = useState(reservation?.time || "19:00");
  const [duration, setDuration] = useState(String(reservation?.duration || 120));
  const [tableId, setTableId] = useState(reservation?.tableId || "");
  const [note, setNote] = useState(reservation?.note || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerName.trim() || !tableId || !date || !time) {
      toast.error("Izpolni vsaj: ime, miza, datum, čas");
      return;
    }
    setSaving(true);
    try {
      const url = reservation
        ? `/api/reservations/${reservation.id}`
        : "/api/reservations";
      const method = reservation ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          partySize: parseInt(partySize, 10),
          date,
          time,
          duration: parseInt(duration, 10),
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success(reservation ? "Rezervacija posodobljena" : "Rezervacija ustvarjena");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message || "Napaka");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-600" />
            {reservation ? "Uredi rezervacijo" : "Nova rezervacija"}
          </DialogTitle>
          <DialogDescription>
            {reservation
              ? `${reservation.customerName} • ${reservation.date}`
              : "Rezerviraj mizo za goste"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="name">Ime gosta *</Label>
            <Input
              id="name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="npr. Janez Novak"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="031 234 567"
              />
            </div>
            <div>
              <Label htmlFor="size">Število oseb *</Label>
              <Input
                id="size"
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="table">Miza *</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger id="table">
                <SelectValue placeholder="Izberi mizo..." />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.seats} oseb, {t.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Čas *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dur">Trajanje (min)</Label>
              <Input
                id="dur"
                type="number"
                step={30}
                min={30}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">Opomba</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. Alergija na gluten, rojstni dan"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Prekliči
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
