"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plane,
  Globe,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  FileText,
  Euro,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface TaxFreeItem {
  id: string;
  invoiceNumber: string | null;
  receiptNo: string | null;
  total: number;
  vatTotal: number;
  netTotal: number;
  refundAmount: number;
  paidAt: string | null;
  operator: string;
  customerCountry: string | null;
  passportNumber: string | null;
  tfStatus: string;
  itemCount: number;
}

interface TaxFreeData {
  period: { from: string; to: string };
  tenant: { name: string; taxNumber: string };
  items: TaxFreeItem[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    paid: number;
    totalRefundable: number;
    totalProcessed: number;
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  DE: "Nemčija",
  FR: "Francija",
  IT: "Italija",
  AT: "Avstrija",
  HR: "Hrvaška",
  GB: "Velika Britanija",
  US: "ZDA",
  RU: "Rusija",
  CN: "Kitajska",
  JP: "Japonska",
  CH: "Švica",
  NO: "Norveška",
};

function countryName(code: string | null): string {
  if (!code) return "Ni navedeno";
  return COUNTRY_NAMES[code] || code;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

function statusConfig(status: string) {
  switch (status) {
    case "approved":
      return {
        label: "Odobreno",
        icon: CheckCircle2,
        className:
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
      };
    case "rejected":
      return {
        label: "Zavrnjeno",
        icon: XCircle,
        className:
          "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
      };
    case "paid":
      return {
        label: "Izplačano",
        icon: Banknote,
        className:
          "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
      };
    default:
      return {
        label: "Na čakanju",
        icon: Clock,
        className:
          "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
      };
  }
}

export function TaxFreeView() {
  const [data, setData] = useState<TaxFreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<TaxFreeItem | null>(null);
  const [processStatus, setProcessStatus] = useState("approved");
  const [passport, setPassport] = useState("");
  const [country, setCountry] = useState("");
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/tax-free${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju tax-free računov");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selected) {
      setProcessStatus(selected.tfStatus === "pending" ? "approved" : selected.tfStatus);
      setPassport(selected.passportNumber || "");
      setCountry(selected.customerCountry || "");
    }
  }, [selected]);

  async function processTaxFree() {
    if (!selected) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/tax-free", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          orderId: selected.id,
          status: processStatus,
          passportNumber: passport,
          country,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(`✓ Tax-free status posodobljen na "${statusConfig(processStatus).label}"`);
      setSelected(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri posodabljanju");
    } finally {
      setProcessing(false);
    }
  }

  function exportCsv() {
    if (!data || data.items.length === 0) return;
    const lines: string[] = [];
    lines.push(`Tax-free poročilo;${data.tenant.name};${data.tenant.taxNumber}`);
    lines.push(`Obdobje;${formatDate(data.period.from)} - ${formatDate(data.period.to)}`);
    lines.push("");
    lines.push("ŠT.RAČUNA;DATUM;DRŽAVA;POTNI LIST;STATUS;NETO;DDV;BRUTO");
    for (const item of data.items) {
      lines.push(
        `${item.invoiceNumber || item.receiptNo};${formatDate(item.paidAt)};${countryName(item.customerCountry)};${item.passportNumber || ""};${statusConfig(item.tfStatus).label};${item.netTotal.toFixed(2)};${item.vatTotal.toFixed(2)};${item.total.toFixed(2)}`
      );
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tax-free-${data.period.from}-${data.period.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✓ CSV izvožen");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Tax-free povračila</h2>
          <p className="text-sm text-muted-foreground">Povračilo DDV za turiste</p>
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
            <Plane className="h-6 w-6 text-emerald-600" />
            Tax-free povračila
          </h2>
          <p className="text-sm text-muted-foreground">
            Povračilo DDV za turiste (ne-EU državljani) — {data.tenant.name}
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline">
          <Download className="mr-1.5 h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div className="text-sm text-emerald-800 dark:text-emerald-200">
            <p className="font-medium">Pravila za tax-free v Sloveniji</p>
            <p className="mt-1 text-xs">
              Skupni znesek računa mora biti nad 50€. Povračilo velja za državljane izven EU
              (z rezidenco izven EU). Rok za izplačilo: 3 mesece od datuma nakupa. Povračilo
              DDV se izplača ob predložitvi računa in potnega lista na meji.
            </p>
          </div>
        </div>
      </Card>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">
                Na čakanju
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {s.pending}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Odobreno
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.approved}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Za povračilo
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatEUR(s.totalRefundable)}
              </p>
            </div>
            <Euro className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-300 bg-emerald-100 p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Izplačano
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatEUR(s.totalProcessed)}
              </p>
            </div>
            <Banknote className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči po št. računa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi statusi</SelectItem>
            <SelectItem value="pending">Na čakanju</SelectItem>
            <SelectItem value="approved">Odobreno</SelectItem>
            <SelectItem value="rejected">Zavrnjeno</SelectItem>
            <SelectItem value="paid">Izplačano</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full sm:w-40"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* Tabela računov */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="px-3 py-3 text-left font-semibold">Št. računa</th>
                <th className="px-3 py-3 text-left font-semibold">Datum</th>
                <th className="px-3 py-3 text-right font-semibold">Bruto</th>
                <th className="px-3 py-3 text-right font-semibold">DDV</th>
                <th className="px-3 py-3 text-right font-semibold">Povračilo</th>
                <th className="px-3 py-3 text-left font-semibold">Država</th>
                <th className="px-3 py-3 text-left font-semibold">Potni list</th>
                <th className="px-3 py-3 text-center font-semibold">Status</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Ni tax-free računov, ki ustrezajo filtrom
                  </td>
                </tr>
              ) : (
                data.items.map((item) => {
                  const cfg = statusConfig(item.tfStatus);
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-3 py-3 font-medium">
                        {item.invoiceNumber || item.receiptNo || "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(item.paidAt)}
                      </td>
                      <td className="px-3 py-3 text-right">{formatEUR(item.total)}</td>
                      <td className="px-3 py-3 text-right text-amber-700 dark:text-amber-400">
                        {formatEUR(item.vatTotal)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600">
                        {formatEUR(item.refundAmount)}
                      </td>
                      <td className="px-3 py-3 text-xs">{countryName(item.customerCountry)}</td>
                      <td className="px-3 py-3 text-xs font-mono">
                        {item.passportNumber || "—"}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={cfg.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="ghost">
                          Obdelaj
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Process dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Tax-free obdelava — {selected?.invoiceNumber || selected?.receiptNo}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Račun info */}
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Bruto znesek</p>
                  <p className="font-medium">{formatEUR(selected.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Neto</p>
                  <p className="font-medium">{formatEUR(selected.netTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DDV</p>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {formatEUR(selected.vatTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Povračilo</p>
                  <p className="font-bold text-emerald-600">
                    {formatEUR(selected.refundAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">{formatDate(selected.paidAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operater</p>
                  <p className="font-medium">{selected.operator}</p>
                </div>
              </div>

              {/* Obrazec */}
              <div className="space-y-3">
                <div>
                  <Label>Država stranke</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izberi državo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name} ({code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Številka potnega lista</Label>
                  <Input
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    placeholder="npr. AB1234567"
                  />
                </div>
                <div>
                  <Label>Status obdelave</Label>
                  <Select value={processStatus} onValueChange={setProcessStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Na čakanju</SelectItem>
                      <SelectItem value="approved">Odobreno</SelectItem>
                      <SelectItem value="rejected">Zavrnjeno</SelectItem>
                      <SelectItem value="paid">Izplačano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Prekliči
            </Button>
            <Button
              onClick={processTaxFree}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? "Obdelujem..." : "Shrani"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {data.items.length === 0 && (
        <EmptyState
          icon={Plane}
          title="Ni tax-free računov"
          description="Tax-free računi se ustvarijo ob označevanju računa z flag 'tax_free'"
        />
      )}
    </div>
  );
}
