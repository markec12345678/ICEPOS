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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  FileCheck2,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface FursItem {
  id: string;
  receiptNo: string | null;
  invoiceNumber: string | null;
  zoi: string | null;
  eor: string | null;
  fursXml: string;
  fursStatus: "fiscalized" | "pending" | "storno" | "error";
  status: string;
  total: number;
  vatTotal: number;
  paymentMethod: string | null;
  operator: string;
  businessUnit: string;
  cashRegister: string;
  createdAt: string;
  paidAt: string | null;
  stornoOf: string | null;
  stornoParentReceipt: string | null;
  stornoParentTotal: number | null;
  stornoReason: string | null;
  stornoAt: string | null;
  stornoZoi: string | null;
  stornoEor: string | null;
}

interface FursData {
  period: { from: string; to: string };
  tenant: {
    name: string;
    taxNumber: string;
    businessUnit: string;
    cashRegister: string;
    fursEnv: string;
  };
  items: FursItem[];
  summary: {
    total: number;
    fiscalized: number;
    pending: number;
    storno: number;
    error: number;
    withXml: number;
    totalGross: number;
    totalVat: number;
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Gotovina",
  card: "Kartica",
  giftcard: "Darilna kartica",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusConfig(status: FursItem["fursStatus"]) {
  switch (status) {
    case "fiscalized":
      return {
        label: "Fiskalizirano",
        icon: FileCheck2,
        className:
          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
      };
    case "pending":
      return {
        label: "Na čakanju",
        icon: Clock,
        className:
          "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
      };
    case "storno":
      return {
        label: "Storno",
        icon: XCircle,
        className:
          "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
      };
    case "error":
      return {
        label: "Napaka",
        icon: AlertTriangle,
        className:
          "border-red-400 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
      };
  }
}

export function FursAuditView() {
  const [data, setData] = useState<FursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<FursItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const url = `/api/furs-audit${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju FURS dnevnika");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">FURS dnevnik</h2>
          <p className="text-sm text-muted-foreground">Revizijski dnevnik fiskaliziranih računov</p>
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
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          FURS dnevnik
        </h2>
        <p className="text-sm text-muted-foreground">
          Revizijski dnevnik fiskaliziranih računov — {data.tenant.name} (davčna št.{" "}
          {data.tenant.taxNumber}, poslovni prostor: {data.tenant.businessUnit}, blagajna:{" "}
          {data.tenant.cashRegister}, okolje:{" "}
          <Badge variant="outline" className="ml-1 text-xs">
            {data.tenant.fursEnv === "production" ? "Produkcija" : "Test"}
          </Badge>
          )
        </p>
      </div>

      {/* KPI kartice */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Fiskalizirano
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.fiscalized}
              </p>
            </div>
            <FileCheck2 className="h-8 w-8 text-emerald-600/60" />
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
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Storno
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{s.storno}</p>
            </div>
            <XCircle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Z XML</p>
              <p className="text-2xl font-bold">{s.withXml}</p>
            </div>
            <FileCheck2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
      </div>

      {/* Skupni znesek */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Bruto promet</p>
          <p className="text-xl font-bold">{formatEUR(s.totalGross)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">DDV</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
            {formatEUR(s.totalVat)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Neto</p>
          <p className="text-xl font-bold text-emerald-600">
            {formatEUR(s.totalGross - s.totalVat)}
          </p>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči po št. računa, ZOI, EOR..."
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
            <SelectItem value="fiscalized">Fiskalizirano</SelectItem>
            <SelectItem value="pending">Na čakanju</SelectItem>
            <SelectItem value="storno">Storno</SelectItem>
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
                <th className="px-3 py-3 text-right font-semibold">Znesek</th>
                <th className="px-3 py-3 text-right font-semibold">DDV</th>
                <th className="px-3 py-3 text-left font-semibold">Plačilo</th>
                <th className="px-3 py-3 text-left font-semibold">Operater</th>
                <th className="px-3 py-3 text-center font-semibold">Status</th>
                <th className="px-3 py-3 text-center font-semibold">ZOI/EOR</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Ni računov, ki ustrezajo filtrom
                  </td>
                </tr>
              ) : (
                data.items.slice(0, 100).map((item) => {
                  const cfg = statusConfig(item.fursStatus);
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                      onClick={() => setSelected(item)}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">
                          {item.invoiceNumber || item.receiptNo || "—"}
                        </p>
                        {item.stornoParentReceipt && (
                          <p className="text-xs text-rose-600">
                            Storno računa {item.stornoParentReceipt}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatEUR(item.total)}
                      </td>
                      <td className="px-3 py-3 text-right text-amber-700 dark:text-amber-400">
                        {formatEUR(item.vatTotal)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {item.paymentMethod
                          ? PAYMENT_LABELS[item.paymentMethod] || item.paymentMethod
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs">{item.operator}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={cfg.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {item.zoi ? (
                          <span title={item.zoi} className="font-mono text-xs">
                            {item.zoi.slice(0, 8)}…
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {item.eor && (
                          <span title={item.eor} className="ml-1 font-mono text-xs text-emerald-600">
                            ✓
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {data.items.length > 100 && (
          <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
            Prikazujem prvih 100 od {data.items.length} računov. Uporabi filter za zožitev.
          </div>
        )}
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const cfg = statusConfig(selected.fursStatus);
                const Icon = cfg.icon;
                return <Icon className="h-5 w-5" />;
              })()}
              Račun {selected?.invoiceNumber || selected?.receiptNo || "—"}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Status badge */}
              <div>
                <Badge variant="outline" className={statusConfig(selected.fursStatus).className}>
                  {statusConfig(selected.fursStatus).label}
                </Badge>
              </div>

              {/* Osnovni podatki */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Datum izdaje</p>
                  <p className="font-medium">{formatDateTime(selected.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Datum plačila</p>
                  <p className="font-medium">
                    {selected.paidAt ? formatDateTime(selected.paidAt) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Bruto znesek</p>
                  <p className="font-medium">{formatEUR(selected.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">DDV</p>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {formatEUR(selected.vatTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plačilna metoda</p>
                  <p className="font-medium">
                    {selected.paymentMethod
                      ? PAYMENT_LABELS[selected.paymentMethod] || selected.paymentMethod
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Operater</p>
                  <p className="font-medium">{selected.operator}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Poslovni prostor</p>
                  <p className="font-medium">{selected.businessUnit}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blagajna</p>
                  <p className="font-medium">{selected.cashRegister}</p>
                </div>
              </div>

              {/* FURS podatki */}
              <div className="space-y-2 rounded border p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  FURS identifikatorji
                </p>
                <div>
                  <p className="text-xs text-muted-foreground">ZOI (zaščitna oznaka izdajatelja)</p>
                  <p className="break-all font-mono text-xs">
                    {selected.zoi || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">EOR (enkratna identifikacija računa)</p>
                  <p className="break-all font-mono text-xs">
                    {selected.eor || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">XML podpisan</p>
                  <p className="font-medium">
                    {selected.fursXml === "da" ? "Da" : "Ne"}
                  </p>
                </div>
              </div>

              {/* Storno podatki */}
              {selected.fursStatus === "storno" && (
                <div className="space-y-2 rounded border border-rose-300 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950/30">
                  <p className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-300">
                    Storno podatki
                  </p>
                  {selected.stornoParentReceipt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Stornirani račun</p>
                      <p className="font-medium">
                        {selected.stornoParentReceipt}
                        {selected.stornoParentTotal &&
                          ` (${formatEUR(selected.stornoParentTotal)})`}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Razlog storna</p>
                    <p className="font-medium">{selected.stornoReason || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Datum storna</p>
                    <p className="font-medium">
                      {selected.stornoAt ? formatDateTime(selected.stornoAt) : "—"}
                    </p>
                  </div>
                  {selected.stornoZoi && (
                    <div>
                      <p className="text-xs text-muted-foreground">Storno ZOI</p>
                      <p className="break-all font-mono text-xs">{selected.stornoZoi}</p>
                    </div>
                  )}
                  {selected.stornoEor && (
                    <div>
                      <p className="text-xs text-muted-foreground">Storno EOR</p>
                      <p className="break-all font-mono text-xs">{selected.stornoEor}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {data.items.length === 0 && (
        <EmptyState
          icon={ShieldAlert}
          title="Ni računov"
          description="V izbranem obdobju ni bilo najdenih računov"
        />
      )}
    </div>
  );
}
