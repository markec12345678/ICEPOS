"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Star,
  TrendingUp,
  Users,
  Euro,
  Award,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Transaction {
  orderId: string;
  invoiceNumber: string | null;
  paidAt: string | null;
  amount: number;
  pointsEarned: number;
  paymentMethod: string | null;
}

interface CustomerHistory {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  currentPoints: number;
  totalSpent: number;
  visitCount: number;
  ordersInPeriod: number;
  totalSpentInPeriod: number;
  pointsEarnedInPeriod: number;
  avgOrderValue: number;
  transactions: Transaction[];
  lastVisit: string | null;
}

interface MonthlyEntry {
  month: string;
  pointsEarned: number;
  totalSpent: number;
  orderCount: number;
}

interface Summary {
  totalCustomers: number;
  activeInPeriod: number;
  totalPointsEarned: number;
  totalSpentInPeriod: number;
  totalCurrentPoints: number;
  avgPointsPerCustomer: number;
  avgSpentPerCustomer: number;
}

interface HistoryData {
  period: { from: string; to: string };
  loyaltyRate: number;
  customers: CustomerHistory[];
  topEarners: CustomerHistory[];
  monthly: MonthlyEntry[];
  summary: Summary;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("sl-SI", { month: "short", year: "numeric" });
}

export function LoyaltyHistoryView() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerHistory | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/loyalty-history${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju zgodovine točk");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Zgodovina točk</h2>
          <p className="text-sm text-muted-foreground">Zvestobni program</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;
  const filteredCustomers = data.customers.filter(
    (c) => !search || c.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Star className="h-6 w-6 text-amber-600" />
          Zgodovina točk zvestobe
        </h2>
        <p className="text-sm text-muted-foreground">
          Sledenje točk zvestobe, transakcij in aktivnosti strank
        </p>
      </div>

      {/* Period filter */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Od datuma</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Do datuma</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <Calendar className="mr-1 inline h-3 w-3" />
          Obdobje: {data.period.from} – {data.period.to} · Tečaj: 1 točka na {formatEUR(1 / data.loyaltyRate)}
        </p>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Aktivne stranke</p>
              <p className="text-2xl font-bold">{s.activeInPeriod}</p>
              <p className="text-xs text-muted-foreground">od {s.totalCustomers} skupaj</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Točk v obdobju</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{s.totalPointsEarned}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">pov. {s.avgPointsPerCustomer.toFixed(1)} / stranko</p>
            </div>
            <Star className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Poraba v obdobju</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalSpentInPeriod)}</p>
              <p className="text-xs text-muted-foreground">pov. {formatEUR(s.avgSpentPerCustomer)} / stranko</p>
            </div>
            <Euro className="h-8 w-8 text-emerald-600/40" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupne točke</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{s.totalCurrentPoints}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Top earners */}
      {data.topEarners.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Award className="h-5 w-5" />
            Top 10 po točkah v obdobju
          </h3>
          <div className="space-y-2">
            {data.topEarners.map((c, idx) => (
              <button
                key={c.customerId}
                className="flex w-full items-center justify-between rounded border p-2 text-left text-sm transition-colors hover:bg-muted/30"
                onClick={() => setSelected(c)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `${idx + 1}.`}</span>
                  <div>
                    <p className="font-medium">{c.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.ordersInPeriod} obiskov · {formatEUR(c.totalSpentInPeriod)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600">
                    <Star className="mr-1 h-3 w-3 fill-current" />
                    {c.pointsEarnedInPeriod}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Mesečni pregled */}
      {data.monthly.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Mesečni pregled točk</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold">Mesec</th>
                  <th className="px-3 py-2 text-right font-semibold">Računov</th>
                  <th className="px-3 py-2 text-right font-semibold">Poraba</th>
                  <th className="px-3 py-2 text-right font-semibold">Točk</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.slice(-12).map((m) => (
                  <tr key={m.month} className="border-b">
                    <td className="px-3 py-2 font-medium">{formatMonth(m.month)}</td>
                    <td className="px-3 py-2 text-right">{m.orderCount}</td>
                    <td className="px-3 py-2 text-right">{formatEUR(m.totalSpent)}</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-600">{m.pointsEarned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Vse stranke */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Ni strank"
          description="Ni strank, ki ustrezajo iskanju"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold">Vse stranke</h3>
              <Input
                placeholder="Išči stranke..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Stranka</th>
                  <th className="px-3 py-3 text-right font-semibold">Trenutne točke</th>
                  <th className="px-3 py-3 text-right font-semibold">Obiskov</th>
                  <th className="px-3 py-3 text-right font-semibold">Poraba skupaj</th>
                  <th className="px-3 py-3 text-right font-semibold">V obdobju</th>
                  <th className="px-3 py-3 text-right font-semibold">Točk v obdobju</th>
                  <th className="px-3 py-3 text-left font-semibold">Zadnji obisk</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.slice(0, 50).map((c) => (
                  <tr
                    key={c.customerId}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-3 py-3 font-medium">{c.customerName}</td>
                    <td className="px-3 py-3 text-right">
                      <Badge variant="outline" className="text-amber-600">
                        <Star className="mr-1 h-3 w-3 fill-current" />
                        {c.currentPoints}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">{c.visitCount}</td>
                    <td className="px-3 py-3 text-right">{formatEUR(c.totalSpent)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatEUR(c.totalSpentInPeriod)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-amber-600">
                      {c.pointsEarnedInPeriod}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatDate(c.lastVisit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600" />
              {selected?.customerName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Kontakt in točke */}
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Trenutne točke</p>
                  <p className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="h-4 w-4 fill-current" />
                    {selected.currentPoints}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skupna poraba</p>
                  <p className="font-medium">{formatEUR(selected.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  {selected.customerPhone ? (
                    <a href={`tel:${selected.customerPhone}`} className="flex items-center gap-1 font-medium text-blue-600">
                      <Phone className="h-3 w-3" />
                      {selected.customerPhone}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  {selected.customerEmail ? (
                    <a href={`mailto:${selected.customerEmail}`} className="flex items-center gap-1 font-medium text-blue-600">
                      <Mail className="h-3 w-3" />
                      {selected.customerEmail}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>

              {/* Statistika obdobja */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded border bg-muted/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Obiskov</p>
                  <p className="text-xl font-bold">{selected.ordersInPeriod}</p>
                </div>
                <div className="rounded border bg-muted/20 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Poraba</p>
                  <p className="text-xl font-bold">{formatEUR(selected.totalSpentInPeriod)}</p>
                </div>
                <div className="rounded border bg-amber-50 p-3 text-center dark:bg-amber-950/30">
                  <p className="text-xs text-muted-foreground">Točk</p>
                  <p className="text-xl font-bold text-amber-600">{selected.pointsEarnedInPeriod}</p>
                </div>
              </div>

              {/* Transakcije */}
              {selected.transactions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Zadnje transakcije ({selected.transactions.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted/30">
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-semibold">Datum</th>
                          <th className="px-3 py-2 text-left font-semibold">Račun</th>
                          <th className="px-3 py-2 text-right font-semibold">Znesek</th>
                          <th className="px-3 py-2 text-right font-semibold">Točke</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.transactions.map((t) => (
                          <tr key={t.orderId} className="border-b">
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {formatDateTime(t.paidAt)}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono">
                              {t.invoiceNumber || "—"}
                            </td>
                            <td className="px-3 py-2 text-right">{formatEUR(t.amount)}</td>
                            <td className="px-3 py-2 text-right font-bold text-amber-600">
                              +{t.pointsEarned}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
