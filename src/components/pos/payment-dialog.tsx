"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/stores/pos-store";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, formatDateTime, type Order, type Table } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  CheckCircle2,
  Printer,
  X,
  ShieldCheck,
  Users,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FursQrCode } from "@/components/pos/furs-qr-code";
import { SplitBillDialog } from "@/components/pos/split-bill-dialog";
import { authHeaders } from "@/components/pos/pin-login";

type TableWithOrders = Table & {
  orders: (Order & {
    items: {
      id: string;
      menuItem: { id: string; name: string; price: number; vatRate: number };
      quantity: number;
      unitPrice: number;
      vatRate: number;
      note?: string | null;
    }[];
  })[];
};

interface PaidResult extends Order {
  zoi: string | null;
  eor: string | null;
  invoiceNumber: string | null;
  fursXmlPreview?: string;
}

export function PaymentDialog() {
  const {
    paymentOpen,
    setPaymentOpen,
    selectedTableId,
    cart,
    clearCart,
    selectTable,
    discountPercent,
    setDiscountPercent,
  } = usePosStore();

  const { data: tables, refetch } = useFetch<TableWithOrders[]>("/api/tables");
  const [method, setMethod] = useState<"cash" | "card" | "giftcard">("cash");
  const [tendered, setTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [gcBalance, setGcBalance] = useState<number | null>(null);
  const [gcError, setGcError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [tipMode, setTipMode] = useState<"none" | "percent" | "fixed">("none");
  const [tipPercent, setTipPercent] = useState("10");
  const [tipFixed, setTipFixed] = useState("");

  const selectedTable = tables?.find((t) => t.id === selectedTableId);
  const openOrder = selectedTable?.orders.find((o) => o.status === "open");

  const grossTotal = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const grossVat = cart.reduce(
    (s, c) => s + c.menuItem.price * c.quantity * c.menuItem.vatRate,
    0
  );
  const discountAmount = (grossTotal * discountPercent) / 100;
  const total = grossTotal - discountAmount;
  // Popust se proporcionalno porazdeli na DDV
  const vat = grossVat * (1 - discountPercent / 100);
  const subtotal = total - vat;

  // Napitnina
  const tipAmount =
    tipMode === "percent"
      ? (total * (parseFloat(tipPercent) || 0)) / 100
      : tipMode === "fixed"
      ? parseFloat(tipFixed) || 0
      : 0;
  const grandTotal = total + tipAmount;

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - grandTotal;

  // Počisti paid ob zaprtju
  useEffect(() => {
    if (!paymentOpen) {
      const t = setTimeout(() => setPaid(null), 200);
      return () => clearTimeout(t);
    }
  }, [paymentOpen]);

  function close() {
    setPaymentOpen(false);
    if (paid) {
      clearCart();
      selectTable(null);
      setTendered("");
      setDiscountPercent(0);
      setGiftCardCode("");
      setGcBalance(null);
      setGcError("");
      setSelectedCustomerId(null);
      setSelectedCustomerName(null);
      setCustomerSearch("");
      setTipMode("none");
      setTipPercent("10");
      setTipFixed("");
      refetch();
    }
  }

  async function processPayment() {
    if (!openOrder) {
      toast.error("Ni aktivnega naročila");
      return;
    }
    if (method === "cash" && tenderedNum < grandTotal) {
      toast.error("Prejeto je manj kot znaša račun");
      return;
    }
    if (method === "giftcard" && !giftCardCode.trim()) {
      toast.error("Vnesite kodo darilne kartice");
      return;
    }
    setProcessing(true);
    try {
      const payload: Record<string, unknown> = { paymentMethod: method };
      if (method === "giftcard") payload.giftCardCode = giftCardCode.trim().toUpperCase();
      if (selectedCustomerId) payload.customerId = selectedCustomerId;
      if (tipAmount > 0) payload.tip = Math.round(tipAmount * 100) / 100;

      const res = await fetch(`/api/orders/${openOrder.id}/pay`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Napaka");
      }
      const result = (await res.json()) as PaidResult;
      setPaid(result);
      toast.success("Račun fiskaliziran preko FURS", {
        description: `ZOI: ${result.zoi?.slice(0, 16)}...`,
      });
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri plačilu");
    } finally {
      setProcessing(false);
    }
  }

  const quickAmounts = [
    grandTotal,
    Math.ceil(grandTotal / 5) * 5,
    Math.ceil(grandTotal / 10) * 10,
    Math.ceil(grandTotal / 20) * 20,
  ].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Dialog
      open={paymentOpen}
      onOpenChange={(o) => {
        if (!o) close();
        else setPaymentOpen(true);
      }}
    >
      <DialogContent className="max-w-md overflow-hidden p-0 sm:max-w-lg print:block print:max-w-none print:p-0 print:shadow-none">
        {paid ? (
          <ReceiptView paid={paid} onClose={close} />
        ) : (
          <>
            <DialogHeader className="border-b border-border px-5 py-4">
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-amber-600" />
                Plačilo računa
              </DialogTitle>
              <DialogDescription>
                {selectedTable?.name} &middot;{" "}
                {cart.reduce((s, c) => s + c.quantity, 0)} postavk
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-5 py-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Vrednost (brez DDV)</span>
                  <span>{formatEUR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>DDV</span>
                  <span>{formatEUR(vat)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Popust ({discountPercent}%)</span>
                    <span>-{formatEUR(discountAmount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Skupaj</span>
                  <span className="text-amber-700 dark:text-amber-400">
                    {formatEUR(total)}
                  </span>
                </div>
                {tipAmount > 0 && (
                  <>
                    <div className="mt-1 flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Napitnina</span>
                      <span>+{formatEUR(tipAmount)}</span>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex justify-between text-base font-bold">
                      <span>Za plačilo</span>
                      <span className="text-amber-700 dark:text-amber-400">
                        {formatEUR(grandTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Napitnina selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Napitnina (opcijsko)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setTipMode("none")}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      tipMode === "none"
                        ? "border-border bg-muted"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    Brez
                  </button>
                  {[5, 10, 15].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setTipMode("percent");
                        setTipPercent(String(p));
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        tipMode === "percent" && tipPercent === String(p)
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      {p}%
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTipMode("fixed")}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        tipMode === "fixed"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      €
                    </button>
                    {tipMode === "fixed" && (
                      <Input
                        type="number"
                        step="0.50"
                        value={tipFixed}
                        onChange={(e) => setTipFixed(e.target.value)}
                        placeholder="0.00"
                        className="h-7 w-20 text-xs"
                      />
                    )}
                    {tipMode === "percent" && (
                      <Input
                        type="number"
                        step="1"
                        value={tipPercent}
                        onChange={(e) => setTipPercent(e.target.value)}
                        className="h-7 w-16 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setMethod("cash")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    method === "cash"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:bg-muted hover:border-amber-200"
                  )}
                >
                  <Banknote className="h-6 w-6" />
                  <span className="text-sm font-medium">Gotovina</span>
                </button>
                <button
                  onClick={() => setMethod("card")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    method === "card"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-border hover:bg-muted hover:border-amber-200"
                  )}
                >
                  <CreditCard className="h-6 w-6" />
                  <span className="text-sm font-medium">Kartica</span>
                </button>
                <button
                  onClick={() => setMethod("giftcard")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    method === "giftcard"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                      : "border-border hover:bg-muted hover:border-purple-200"
                  )}
                >
                  <Gift className="h-6 w-6" />
                  <span className="text-sm font-medium">Kartica darilo</span>
                </button>
              </div>

              {method === "cash" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prejeto</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={total.toFixed(2)}
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {quickAmounts.map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setTendered(amt.toFixed(2))}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                      >
                        {formatEUR(amt)}
                      </button>
                    ))}
                  </div>
                  {tenderedNum > 0 && (
                    <div className="flex justify-between rounded-md bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Vračilo
                      </span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatEUR(Math.max(0, change))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {method === "card" && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  <CreditCard className="mx-auto mb-2 h-6 w-6" />
                  Stranka bo prislonila kartico na terminalu.
                </div>
              )}

              {method === "giftcard" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Koda darilne kartice</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="GC-XXXXXXXX"
                      value={giftCardCode}
                      onChange={(e) => {
                        setGiftCardCode(e.target.value.toUpperCase());
                        setGcBalance(null);
                        setGcError("");
                      }}
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!giftCardCode.trim()) return;
                        try {
                          const res = await fetch(`/api/gift-cards/${giftCardCode.trim().toUpperCase()}`);
                          const data = await res.json();
                          if (!res.ok) {
                            setGcError(data.error || "Ni najden");
                            setGcBalance(null);
                            return;
                          }
                          setGcBalance(data.balance);
                          setGcError("");
                        } catch {
                          setGcError("Napaka pri iskanju");
                        }
                      }}
                    >
                      Preveri
                    </Button>
                  </div>
                  {gcError && (
                    <p className="text-sm text-rose-600">{gcError}</p>
                  )}
                  {gcBalance !== null && (
                    <div className={cn(
                      "rounded-lg p-3 text-sm",
                      gcBalance >= total
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                    )}>
                      <div className="flex justify-between">
                        <span>Stanje na kartici:</span>
                        <span className="font-bold">{formatEUR(gcBalance)}</span>
                      </div>
                      {gcBalance >= total ? (
                        <div className="mt-1 flex justify-between">
                          <span>Po plačilu:</span>
                          <span className="font-bold">{formatEUR(gcBalance - total)}</span>
                        </div>
                      ) : (
                        <p className="mt-1 font-medium">Premajhno stanje!</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Stranka (loyalty) — vedno prikazano */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Stranka (loyalty — opcijsko)
                </label>
                {selectedCustomerId ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 dark:border-emerald-900 dark:bg-emerald-950/20">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      👤 {selectedCustomerName}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCustomerId(null);
                        setSelectedCustomerName(null);
                        setCustomerSearch("");
                      }}
                      className="text-xs text-muted-foreground hover:text-rose-600"
                    >
                      ✕ Odstrani
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Išči po imenu ali telefonu..."
                      value={customerSearch}
                      onChange={async (e) => {
                        setCustomerSearch(e.target.value);
                        if (e.target.value.trim().length < 2) return;
                        // Live search customers
                        try {
                          const res = await fetch("/api/customers");
                          const data = await res.json();
                          const found = data.filter(
                            (c: { name: string; phone?: string | null; id: string }) =>
                              c.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                              (c.phone || "").includes(e.target.value)
                          );
                          // Store in a data attribute for display
                          const el = document.getElementById("customer-results");
                          if (el) {
                            el.innerHTML = found
                              .slice(0, 5)
                              .map(
                                (c: { id: string; name: string; phone?: string | null; points: number }) =>
                                  `<div data-id="${c.id}" data-name="${c.name}" class="cust-result px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/50 last:border-0">${c.name} ${c.phone ? "· " + c.phone : ""} · ${c.points} točk</div>`
                              )
                              .join("");
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      className="text-sm"
                    />
                    {customerSearch.trim().length >= 2 && (
                      <div
                        id="customer-results"
                        className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          const item = target.closest(".cust-result") as HTMLElement | null;
                          if (item) {
                            setSelectedCustomerId(item.dataset.id || null);
                            setSelectedCustomerName(item.dataset.name || null);
                            setCustomerSearch("");
                          }
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-1"
                  onClick={() => setSplitOpen(true)}
                  disabled={cart.length === 0}
                  title="Razdeli račun med več oseb"
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  Razdeli
                </Button>
                <Button
                  onClick={processPayment}
                  disabled={
                    processing ||
                    (method === "cash" && tenderedNum < grandTotal) ||
                    (method === "giftcard" && (gcBalance === null || gcBalance < grandTotal)) ||
                    cart.length === 0
                  }
                  className="col-span-2 bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  {processing ? (
                    "Fiskaliziram..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Plačaj ({formatEUR(grandTotal)})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      <SplitBillDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        total={total}
      />
    </Dialog>
  );
}

function ReceiptView({
  paid,
  onClose,
}: {
  paid: PaidResult;
  onClose: () => void;
}) {
  return (
    <div className="print:block">
      <div className="flex items-center justify-between border-b border-border bg-emerald-50 px-5 py-4 print:hidden animate-fade-in dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Račun fiskaliziran</span>
        </div>
        <button onClick={onClose} className="rounded p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto px-5 py-4 print:max-h-none print:overflow-visible print:px-0 print:py-0">
        <div
          id="printable-receipt"
          className="mx-auto max-w-sm rounded-lg border border-dashed border-border bg-white p-4 font-mono text-xs text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 print:border-0 print:bg-white print:p-2 print:text-neutral-900 print:dark:bg-white print:dark:text-neutral-900"
        >
          <div className="text-center">
            <p className="font-bold">GOSTILNA PRI MARKU, d.o.o.</p>
            <p>Glavni trg 1, 1000 Ljubljana</p>
            <p>Davčna št.: SI12345678</p>
            <p className="mt-1">
              Poslovni prostor: {paid.businessUnit} &middot; Blagajna:{" "}
              {paid.cashRegister}
            </p>
            <Separator className="my-2 border-dashed" />
            <p className="font-bold">RAČUN</p>
          </div>
          <Separator className="my-2 border-dashed" />
          <div className="flex justify-between">
            <span>Št. računa:</span>
            <span className="font-bold">{paid.invoiceNumber || paid.receiptNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Datum:</span>
            <span>{paid.paidAt ? formatDateTime(paid.paidAt) : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span>Miza:</span>
            <span>{paid.table?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Blagajnik:</span>
            <span>{paid.operator}</span>
          </div>
          <Separator className="my-2 border-dashed" />
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] uppercase text-neutral-500">
                <th className="py-0.5">Artikel</th>
                <th className="py-0.5 text-center">Kol</th>
                <th className="py-0.5 text-right">Cena</th>
                <th className="py-0.5 text-right">Skup</th>
              </tr>
            </thead>
            <tbody>
              {paid.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-0.5 pr-1">
                    {it.menuItem.name}
                    <span className="block text-[9px] text-neutral-500">
                      DDV {(it.vatRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-0.5 text-center">{it.quantity}</td>
                  <td className="py-0.5 text-right">
                    {it.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-0.5 text-right font-medium">
                    {(it.unitPrice * it.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Separator className="my-2 border-dashed" />
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Vrednost brez DDV:</span>
              <span>{(paid.total - paid.vatTotal).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>DDV 9,5%:</span>
              <span>
                {paid.items
                  .filter((i) => i.vatRate < 0.2)
                  .reduce(
                    (s, i) => s + i.unitPrice * i.quantity * i.vatRate,
                    0
                  )
                  .toFixed(2)}{" "}
                €
              </span>
            </div>
            <div className="flex justify-between">
              <span>DDV 22%:</span>
              <span>
                {paid.items
                  .filter((i) => i.vatRate >= 0.2)
                  .reduce(
                    (s, i) => s + i.unitPrice * i.quantity * i.vatRate,
                    0
                  )
                  .toFixed(2)}{" "}
                €
              </span>
            </div>
          </div>
          <Separator className="my-2 border-dashed" />
          <div className="flex justify-between text-sm font-bold">
            <span>SKUPAJ:</span>
            <span>{paid.total.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between">
            <span>Plačilo:</span>
            <span>
              {paid.paymentMethod === "card" ? "Kartica" : "Gotovina"}
            </span>
          </div>

          {/* FURS podatki */}
          <Separator className="my-2 border-dashed" />
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-500">
              <ShieldCheck className="h-3 w-3" />
              FURS — SRS fiskaliziran
            </div>
            <div className="break-all text-[9px] text-neutral-600">
              <p>
                ZOI:{" "}
                <span className="font-mono">
                  {paid.zoi || "-"}
                </span>
              </p>
              <p className="mt-1">
                EOR:{" "}
                <span className="font-mono">{paid.eor || "-"}</span>
              </p>
            </div>
            {/* QR koda (FURS) */}
            <div className="mt-2 flex flex-col items-center">
              <FursQrCode
                orderId={paid.id}
                className="h-20 w-20"
                alt="FURS QR koda"
              />
              <p className="mt-0.5 text-[8px] text-neutral-500">
                Skeniraj za preverbo
              </p>
            </div>
          </div>

          <Separator className="my-2 border-dashed" />
          <div className="text-center text-[10px] text-neutral-600">
            <p>Hvala za obisk in lep pozdrav!</p>
            <p className="mt-1">www.gostilnaprimarku.si</p>
            <p className="mt-1 text-[8px]">
              Račun je bil fiskaliziran pri FURS. Fiskalni podatki so zakonsko
              zaščiteni.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border px-5 py-4 print:hidden">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.print()}
        >
          <Printer className="mr-2 h-4 w-4" />
          Natisni
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={onClose}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Zaključi
        </Button>
      </div>
    </div>
  );
}
