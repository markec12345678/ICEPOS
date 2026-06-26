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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FursQrCode } from "@/components/pos/furs-qr-code";
import { SplitBillDialog } from "@/components/pos/split-bill-dialog";

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
  } = usePosStore();

  const { data: tables, refetch } = useFetch<TableWithOrders[]>("/api/tables");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [tendered, setTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState<PaidResult | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  const selectedTable = tables?.find((t) => t.id === selectedTableId);
  const openOrder = selectedTable?.orders.find((o) => o.status === "open");

  const total = cart.reduce((s, c) => s + c.menuItem.price * c.quantity, 0);
  const vat = cart.reduce(
    (s, c) => s + c.menuItem.price * c.quantity * c.menuItem.vatRate,
    0
  );
  const subtotal = total - vat;

  const tenderedNum = parseFloat(tendered) || 0;
  const change = tenderedNum - total;

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
      refetch();
    }
  }

  async function processPayment() {
    if (!openOrder) {
      toast.error("Ni aktivnega naročila");
      return;
    }
    if (method === "cash" && tenderedNum < total) {
      toast.error("Prejeto je manj kot znaša račun");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/orders/${openOrder.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: method }),
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
    total,
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
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
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Skupaj</span>
                  <span className="text-amber-700 dark:text-amber-400">
                    {formatEUR(total)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                    (method === "cash" && tenderedNum < total) ||
                    cart.length === 0
                  }
                  className="col-span-2 bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  {processing ? (
                    "Fiskaliziram..."
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Plačaj ({formatEUR(total)})
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
