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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { authHeaders } from "@/components/pos/pin-login";
import {
  UserCircle,
  Clock,
  Play,
  Square,
  TrendingUp,
  Receipt,
  Banknote,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Shift {
  id: string;
  operator: string;
  operatorTaxNo: string;
  startTime: string;
  endTime: string | null;
  startCash: number;
  endCash: number | null;
  status: "open" | "closed";
  ordersCount: number;
  totalRevenue: number;
  note: string | null;
}

export function ShiftView() {
  const { data: shifts, loading, refetch } = useFetch<Shift[]>("/api/shifts");
  const { data: activeShift, refetch: refetchActive } = useFetch<Shift>(
    "/api/shifts/active"
  );
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  // Auto-refresh aktivne smene vsako minuto (za timer)
  useEffect(() => {
    if (!activeShift) return;
    const t = setInterval(() => refetchActive(), 60000);
    return () => clearInterval(t);
  }, [activeShift, refetchActive]);

  const allShifts = shifts || [];
  const history = allShifts.filter((s) => s.status === "closed").slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Smena blagajnika</h2>
        <p className="text-xs text-muted-foreground">
          FURS zahteva sledljivost operaterjev — začni in zaključi smeno
        </p>
      </div>

      {/* Aktivna smena */}
      {activeShift ? (
        <Card className="overflow-hidden border-emerald-200 p-0 dark:border-emerald-900">
          <div className="bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <UserCircle className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Aktivna smena
                  </p>
                  <h3 className="text-lg font-bold">{activeShift.operator}</h3>
                  <p className="text-xs text-muted-foreground">
                    Davčna: {activeShift.operatorTaxNo}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
              >
                <span className="mr-1 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                V teku
              </Badge>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ShiftStat
                label="Trajanje"
                value={calcDuration(activeShift.startTime)}
                icon={Clock}
              />
              <ShiftStat
                label="Računov"
                value={String(activeShift.ordersCount)}
                icon={Receipt}
              />
              <ShiftStat
                label="Prihodek"
                value={formatEUR(activeShift.totalRevenue)}
                icon={TrendingUp}
              />
              <ShiftStat
                label="Začetna gotovina"
                value={formatEUR(activeShift.startCash)}
                icon={Banknote}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Začetek: {formatDateTime(activeShift.startTime)}
            </p>

            <Button
              onClick={() => setEndOpen(true)}
              className="mt-4 w-full bg-rose-600 hover:bg-rose-700"
            >
              <Square className="mr-2 h-4 w-4" />
              Zaključi smeno
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <UserCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ni aktivne smene</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Za izdajo računov moraš začeti smeno (FURS zahteva).
          </p>
          <Button
            onClick={() => setStartOpen(true)}
            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
          >
            <Play className="mr-2 h-4 w-4" />
            Začni smeno
          </Button>
        </Card>
      )}

      {/* Zgodovina smen */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-bold">Zadnje smene</h3>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ni zgodovine smen.
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.operator}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.startTime)} —{" "}
                    {s.endTime ? formatDateTime(s.endTime) : "..."}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Računov</p>
                    <p className="font-semibold">{s.ordersCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Prihodek</p>
                    <p className="font-semibold text-emerald-600">
                      {formatEUR(s.totalRevenue)}
                    </p>
                  </div>
                  {s.endCash !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Končna gotovina</p>
                      <p className="font-semibold">{formatEUR(s.endCash)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Start dialog */}
      {startOpen && (
        <StartShiftDialog
          onClose={() => setStartOpen(false)}
          onStarted={() => {
            setStartOpen(false);
            refetch();
            refetchActive();
            toast.success("Smena začeta");
          }}
        />
      )}

      {/* End dialog */}
      {endOpen && activeShift && (
        <EndShiftDialog
          shift={activeShift}
          onClose={() => setEndOpen(false)}
          onEnded={() => {
            setEndOpen(false);
            refetch();
            refetchActive();
            toast.success("Smena zaključena");
          }}
        />
      )}
    </div>
  );
}

function ShiftStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function calcDuration(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const ms = now - start;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

function StartShiftDialog({
  onClose,
  onStarted,
}: {
  onClose: () => void;
  onStarted: () => void;
}) {
  const [operator, setOperator] = useState("Ana");
  const [startCash, setStartCash] = useState("100");
  const [saving, setSaving] = useState(false);

  async function start() {
    if (!operator.trim()) {
      toast.error("Vnesi ime operaterja");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          operator: operator.trim(),
          startCash: parseFloat(startCash) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      onStarted();
    } catch (e) {
      toast.error((e as Error).message || "Napaka");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <Play className="h-5 w-5" />
            Začetek smene
          </DialogTitle>
          <DialogDescription>
            Vnesi podatke za začetek delovne smene.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="op">Ime operaterja</Label>
            <Input
              id="op"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="npr. Ana Novak"
            />
          </div>
          <div>
            <Label htmlFor="cash">Začetna gotovina (EUR)</Label>
            <Input
              id="cash"
              type="number"
              step="0.01"
              value={startCash}
              onChange={(e) => setStartCash(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Prekliči
          </Button>
          <Button
            onClick={start}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? "Začenjam..." : "Začni smeno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndShiftDialog({
  shift,
  onClose,
  onEnded,
}: {
  shift: Shift;
  onClose: () => void;
  onEnded: () => void;
}) {
  const [endCash, setEndCash] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    totalTips: number;
    ordersCount: number;
    cashRevenue: number;
    cardRevenue: number;
    expectedCash: number;
    difference: number;
  } | null>(null);

  async function end() {
    setSaving(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}/close`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          endCash: endCash ? parseFloat(endCash) : undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      setSummary(data.summary);
      toast.success("Smena zaključena");
      setTimeout(() => onEnded(), 2000);
    } catch (e) {
      toast.error((e as Error).message || "Napaka");
    } finally {
      setSaving(false);
    }
  }

  if (summary) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-emerald-600">Smena zaključena</DialogTitle>
            <DialogDescription>Povzetek smene {shift.operator}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Skupni prihodek</span>
              <span className="font-bold">{formatEUR(summary.totalRevenue)}</span>
            </div>
            {summary.totalTips > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>🪙 Napitnine</span>
                <span className="font-bold">{formatEUR(summary.totalTips)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Št. računov</span>
              <span className="font-bold">{summary.ordersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gotovina</span>
              <span>{formatEUR(summary.cashRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kartica</span>
              <span>{formatEUR(summary.cardRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pričakovana gotovina</span>
              <span>{formatEUR(summary.expectedCash)}</span>
            </div>
            <div
              className={cn(
                "flex justify-between border-t pt-2 font-bold",
                summary.difference === 0
                  ? "text-emerald-600"
                  : summary.difference > 0
                  ? "text-amber-600"
                  : "text-rose-600"
              )}
            >
              <span>Razlika</span>
              <span>
                {summary.difference > 0 ? "+" : ""}
                {formatEUR(summary.difference)}
              </span>
            </div>
          </div>
          <Button onClick={onEnded} className="w-full">
            Zaključi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <Square className="h-5 w-5" />
            Zaključek smene
          </DialogTitle>
          <DialogDescription>
            {shift.operator} • od {formatDateTime(shift.startTime)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="endcash">Dejanska gotovina v predalu (EUR)</Label>
            <Input
              id="endcash"
              type="number"
              step="0.01"
              value={endCash}
              onChange={(e) => setEndCash(e.target.value)}
              placeholder="npr. 250.00"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Pusti prazno za samodejni izračun (začetna + gotovinski prihodek)
            </p>
          </div>
          <div>
            <Label htmlFor="note">Opomba (opcijsko)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. Posebnosti med smeno"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Prekliči
          </Button>
          <Button
            onClick={end}
            disabled={saving}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {saving ? "Zaključujem..." : "Zaključi smeno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
