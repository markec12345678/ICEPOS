"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarCheck,
  Calendar,
  Users,
  Clock,
  Phone,
  Check,
  X,
  UserX,
  Loader2,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDateTime } from "@/lib/types";
import { authHeaders } from "@/components/pos/pin-login";

interface Reservation {
  id: string;
  tableId: string;
  table: { name: string; number: number };
  customerName: string;
  customerPhone: string | null;
  partySize: number;
  date: string;
  time: string;
  duration: number;
  status: string;
  note: string | null;
  createdAt: string;
}

interface OpenTableStatus {
  configured: boolean;
  webhookUrl: string | null;
  message: string;
}

export function OpenTableView() {
  const [status, setStatus] = useState<OpenTableStatus | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, resRes] = await Promise.all([
        fetch("/api/opentable/status"),
        fetch(`/api/reservations?date=${filterDate}`),
      ]);
      setStatus(await statusRes.json());
      const data = await resRes.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Napaka pri nalaganju rezervacij");
    } finally {
      setLoading(false);
    }
  }, [filterDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function syncFromOpenTable() {
    setSyncing(true);
    try {
      const res = await fetch("/api/opentable/sync", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date: filterDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message || `Sinhronizirano ${data.synced} rezervacij`);
      load();
    } catch {
      toast.error("Napaka pri sinhronizaciji");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(reservationId: string, newStatus: "confirmed" | "seated" | "no_show" | "cancelled") {
    try {
      const res = await fetch(`/api/opentable/reservations/${reservationId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(data.message);
      load();
    } catch {
      toast.error("Napaka pri posodobitvi statusa");
    }
  }

  function copyWebhookUrl() {
    if (status?.webhookUrl) {
      navigator.clipboard.writeText(status.webhookUrl);
      toast.success("Webhook URL kopiran");
    }
  }

  const filteredReservations = reservations.filter(
    (r) => statusFilter === "all" || r.status === statusFilter
  );

  if (loading || !status) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam...</div>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    confirmed: { label: "Potrjeno", color: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" },
    seated: { label: "Sedeči", color: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
    no_show: { label: "Ni prišel", color: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400" },
    cancelled: { label: "Preklicano", color: "border-muted text-muted-foreground" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <CalendarCheck className="h-6 w-6 text-blue-600" />
            Rezervacije (OpenTable/Resy)
          </h2>
          <p className="text-sm text-muted-foreground">
            Sinhronizacija z OpenTable in Resy platformama
          </p>
        </div>
        {status.configured && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <span className="mr-1.5 flex h-2 w-2 rounded-full bg-emerald-500" />
            OpenTable povezan
          </Badge>
        )}
      </div>

      {!status.configured ? (
        <Card className="border-amber-300 bg-amber-50/50 p-6 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                OpenTable ni konfiguriran
              </h3>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                {status.message}
              </p>
              <div className="mt-4 rounded-lg bg-amber-100/50 p-3 text-xs dark:bg-amber-950/40">
                <p className="font-mono font-semibold">.env spremenljivke:</p>
                <pre className="mt-2 overflow-x-auto">
{`OPENTABLE_API_KEY=xxx
OPENTABLE_RESTAURANT_ID=xxx
OPENTABLE_WEBHOOK_SECRET=xxx
# Opcijsko:
RESY_API_KEY=xxx
RESY_RESTAURANT_ID=xxx`}
                </pre>
              </div>
              <a
                href="https://developer.opentable.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                <ExternalLink className="h-3 w-3" />
                Pridobi OpenTable API dostop
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Webhook info */}
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
                <p className="mt-1 font-mono text-sm break-all">
                  {status.webhookUrl}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="mr-1.5 h-3 w-3" />
                Kopiraj
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Sync controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Datum</label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsi</SelectItem>
                <SelectItem value="confirmed">Potrjeno</SelectItem>
                <SelectItem value="seated">Sedeči</SelectItem>
                <SelectItem value="no_show">Ni prišel</SelectItem>
                <SelectItem value="cancelled">Preklicano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {status.configured && (
            <Button onClick={syncFromOpenTable} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              {syncing ? "Sinhroniziram..." : "Sinhroniziraj iz OpenTable"}
            </Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            {filteredReservations.length} rezervacij
          </div>
        </div>
      </Card>

      {/* Reservations list */}
      {filteredReservations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Calendar className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Ni rezervacij za izbran dan</p>
          <p className="text-sm text-muted-foreground">
            {status.configured
              ? "Klikni 'Sinhroniziraj iz OpenTable' za prenos"
              : "Konfiguriraj OpenTable za avtomatsko sinhronizacijo"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredReservations.map((r) => {
            const statusInfo = statusLabels[r.status] || statusLabels.confirmed;
            return (
              <Card key={r.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold">{r.customerName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("sl-SI", { weekday: "short", day: "numeric", month: "short" })} · {r.time}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {r.partySize} oseb
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {r.duration} min
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    Miza: {r.table?.name || "Nedoločena"}
                  </div>
                  {r.customerPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {r.customerPhone}
                    </div>
                  )}
                  {r.note && (
                    <p className="mt-2 rounded bg-muted/50 p-2 text-xs italic">
                      📝 {r.note}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                {r.status === "confirmed" && (
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      onClick={() => updateStatus(r.id, "seated")}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Sedi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300 text-amber-700 text-xs dark:border-amber-800 dark:text-amber-400"
                      onClick={() => updateStatus(r.id, "no_show")}
                    >
                      <UserX className="mr-1 h-3 w-3" />
                      Ni prišel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 text-xs dark:border-rose-800 dark:text-rose-400"
                      onClick={() => updateStatus(r.id, "cancelled")}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Prekliči
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako deluje OpenTable/Resy?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Webhook</strong>: OpenTable pošlje novo rezervacijo na naš webhook endpoint.</p>
          <p>• <strong>Avtomatska kreacija</strong>: rezervacija se shrani v našo bazo z avtomatskim iskanjem proste mize.</p>
          <p>• <strong>Ročna sinhronizacija</strong>: gumb 'Sinhroniziraj iz OpenTable' za prenos rezervacij.</p>
          <p>• <strong>Status update</strong>: ko označimo kot 'Sedeči'/'Ni prišel', se posodobi tudi v OpenTable.</p>
          <p>• <strong>Konflikt miz</strong>: sistem samodejno poišče prosto mizo glede na partySize in čas.</p>
          <p>• <strong>ROI</strong>: manj no-shows (avtomatski SMS opomniki), več rezervacij, boljša izkušnja.</p>
        </div>
      </Card>
    </div>
  );
}
