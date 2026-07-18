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
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Banknote,
  Coins,
  Calendar,
  History,
  TrendingUp,
  TrendingDown,
  PiggyBank,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

// ============================================================
// TIPI
// ============================================================

type EntryType =
  | "cash_in"
  | "cash_out"
  | "sale"
  | "refund"
  | "petty"
  | "start"
  | "end";

interface CashDrawerEntry {
  id: string;
  type: EntryType;
  amount: number;
  direction: "in" | "out";
  reason: string | null;
  operator: string | null;
  shiftId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

interface Balance {
  balance: number;
  todayIn: number;
  todayOut: number;
  todayCount: number;
}

// ============================================================
// OZNAKE / BARVE
// ============================================================

const TYPE_LABEL: Record<EntryType, string> = {
  cash_in: "Vhod gotovine",
  cash_out: "Izhod gotovine",
  sale: "Prodaja",
  refund: "Vračilo",
  petty: "Petty cash",
  start: "Začetek smene",
  end: "Zaključek smene",
};

function typeBadgeClass(type: EntryType): string {
  switch (type) {
    case "cash_in":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    case "cash_out":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400";
    case "sale":
      return "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400";
    case "refund":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
    case "petty":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400";
    case "start":
    case "end":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

// ============================================================
// POMOŽNE FUNKCIJE
// ============================================================

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ============================================================
// GLAVNA KOMPONENTA
// ============================================================

export function CashDrawerView() {
  const [entries, setEntries] = useState<CashDrawerEntry[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(""); // prazno = vsi
  const [dialogOpen, setDialogOpen] = useState(false);
  const [presetType, setPresetType] = useState<EntryType>("cash_in");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = dateFilter ? `?date=${encodeURIComponent(dateFilter)}` : "";
      const [entriesRes, balRes] = await Promise.all([
        fetch(`/api/cash-drawer${qs}`, { headers: authHeaders() }),
        fetch("/api/cash-drawer/balance", { headers: authHeaders() }),
      ]);
      if (!entriesRes.ok || !balRes.ok) throw new Error("Napaka");
      setEntries(await entriesRes.json());
      setBalance(await balRes.json());
    } catch {
      toast.error("Napaka pri nalaganju gotovinske blagajne");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function openDialog(type: EntryType) {
    setPresetType(type);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Header />
        <LoadingSpinner label="Nalagam gotovinsko blagajno..." />
      </div>
    );
  }

  const bal = balance?.balance ?? 0;

  return (
    <div className="space-y-4">
      <Header />

      {/* Balance card — prominent */}
      <Card
        className={`overflow-hidden border-2 ${
          bal >= 0
            ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
            : "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20"
        }`}
      >
        <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                bal >= 0
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              <Wallet className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Trenutno stanje gotovine
              </p>
              <p
                className={`text-4xl font-bold tracking-tight ${
                  bal >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {formatEUR(bal)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bal >= 0 ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                <TrendingUp className="mr-1 h-3 w-3" />
                Pozitivno
              </Badge>
            ) : (
              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                <TrendingDown className="mr-1 h-3 w-3" />
                Negativno
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Današnji vhod"
          value={formatEUR(balance?.todayIn ?? 0)}
          icon={<ArrowDownCircle className="h-5 w-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Današnji izhod"
          value={formatEUR(balance?.todayOut ?? 0)}
          icon={<ArrowUpCircle className="h-5 w-5" />}
          tone="rose"
        />
        <KpiCard
          label="Št. transakcij danes"
          value={String(balance?.todayCount ?? 0)}
          icon={<Receipt className="h-5 w-5" />}
          tone="amber"
        />
        <KpiCard
          label="Trenutno stanje"
          value={formatEUR(bal)}
          icon={<Wallet className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      {/* Quick action buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button
          size="lg"
          variant="outline"
          className="h-auto justify-start gap-3 border-emerald-200 bg-emerald-50/50 py-4 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          onClick={() => openDialog("cash_in")}
        >
          <ArrowDownCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="text-sm font-semibold">Vhod gotovine</div>
            <div className="text-xs text-muted-foreground">Polog v blagajno</div>
          </div>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto justify-start gap-3 border-rose-200 bg-rose-50/50 py-4 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
          onClick={() => openDialog("cash_out")}
        >
          <ArrowUpCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="text-sm font-semibold">Izhod gotovine</div>
            <div className="text-xs text-muted-foreground">Dvig iz blagajne</div>
          </div>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto justify-start gap-3 border-violet-200 bg-violet-50/50 py-4 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-400 dark:hover:bg-violet-950/40"
          onClick={() => openDialog("petty")}
        >
          <PiggyBank className="h-6 w-6" />
          <div className="text-left">
            <div className="text-sm font-semibold">Petty cash</div>
            <div className="text-xs text-muted-foreground">Majhni stroški</div>
          </div>
        </Button>
      </div>

      {/* Filter + history */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Zgodovina transakcij</h3>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[180px]"
          />
          {dateFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilter("")}
            >
              Počisti
            </Button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={Wallet}
            title="Ni transakcij"
            description={
              dateFilter
                ? "Za izbrani datum ni nobenih vnosov v gotovinsko blagajno."
                : "V gotovinski blagajni še ni nobenih vnosov. Uporabite gumbe za vhod/izhod."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Datum/čas</th>
                  <th className="px-4 py-2.5 text-left font-medium">Tip</th>
                  <th className="px-4 py-2.5 text-left font-medium">Razlog</th>
                  <th className="px-4 py-2.5 text-left font-medium">Operater</th>
                  <th className="px-4 py-2.5 text-right font-medium">Znesek</th>
                  <th className="px-4 py-2.5 text-right font-medium">Stanje po</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={typeBadgeClass(e.type)}>
                        {TYPE_LABEL[e.type]}
                      </Badge>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">
                      {e.reason || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {e.operator || "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold ${
                        e.direction === "in"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {e.direction === "in" ? "+" : "−"}
                      {formatEUR(e.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      {formatEUR(e.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="divide-y md:hidden">
            {entries.map((e) => (
              <div key={e.id} className="p-3">
                <div className="flex items-center justify-between">
                  <Badge className={typeBadgeClass(e.type)}>
                    {TYPE_LABEL[e.type]}
                  </Badge>
                  <span
                    className={`font-semibold ${
                      e.direction === "in"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {e.direction === "in" ? "+" : "−"}
                    {formatEUR(e.amount)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {formatDateTime(e.createdAt)} • {e.operator || "—"}
                </p>
                {e.reason && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {e.reason}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Stanje po: <span className="font-medium text-foreground">{formatEUR(e.balanceAfter)}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetType={presetType}
        currentBalance={bal}
        onSaved={load}
      />
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================

function Header() {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Gotovinska blagajna</h2>
      <p className="text-sm text-muted-foreground">
        Sledenje gotovine — vhod/izhod/petty cash
      </p>
    </div>
  );
}

// ============================================================
// KPI CARD
// ============================================================

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "emerald" | "rose" | "amber" | "slate";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneClass}`}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

// ============================================================
// TRANSACTION DIALOG
// ============================================================

const ALL_TYPES: EntryType[] = [
  "cash_in",
  "cash_out",
  "sale",
  "refund",
  "petty",
  "start",
  "end",
];

function TransactionDialog({
  open,
  onOpenChange,
  presetType,
  currentBalance,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  presetType: EntryType;
  currentBalance: number;
  onSaved: () => void;
}) {
  const [type, setType] = useState<EntryType>(presetType);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(presetType);
      setAmount("");
      setReason("");
    }
  }, [open, presetType]);

  const direction: "in" | "out" = useMemo(() => {
    return ["cash_in", "sale", "start"].includes(type) ? "in" : "out";
  }, [type]);

  const amt = parseFloat(amount) || 0;
  const balanceAfter = useMemo(() => {
    return direction === "in" ? currentBalance + amt : currentBalance - amt;
  }, [direction, amt, currentBalance]);

  async function save() {
    if (!type) {
      toast.error("Izberite tip transakcije");
      return;
    }
    if (amt <= 0) {
      toast.error("Vnesite veljaven znesek (večji od 0)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cash-drawer", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ type, amount: amt, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Napaka pri shranjevanju");
        return;
      }
      toast.success("Transakcija zabeležena");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-600" />
            Nova transakcija
          </DialogTitle>
          <DialogDescription>
            Zabeleži vhod/izhod gotovine v blagajno
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Tip transakcije</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Znesek (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Razlog</Label>
            <Textarea
              rows={2}
              placeholder="npr. Nakup zaloge, Majhni stroški, Polog v banko..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Stanje pred:</span>
              <span className="font-medium">{formatEUR(currentBalance)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                {direction === "in" ? (
                  <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ArrowUpCircle className="h-3.5 w-3.5 text-rose-600" />
                )}
                {direction === "in" ? "Vhod" : "Izhod"}:
              </span>
              <span
                className={`font-semibold ${
                  direction === "in"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {direction === "in" ? "+" : "−"}
                {amt > 0 ? formatEUR(amt) : "0,00 €"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="flex items-center gap-1 font-medium">
                <Coins className="h-3.5 w-3.5 text-amber-600" />
                Stanje po:
              </span>
              <span
                className={`text-base font-bold ${
                  balanceAfter >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {formatEUR(balanceAfter)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving || amt <= 0}>
            {saving ? "Shranjujem..." : "Potrdi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
