"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import {
  formatEUR,
  formatDateTime,
  type Order,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FursQrCode } from "@/components/pos/furs-qr-code";

type Receipt = Order & {
  items: { id: string; menuItem: { id: string; name: string; price: number; vatRate: number }; quantity: number; unitPrice: number; vatRate: number; note?: string | null }[];
};

export function ReceiptsView() {
  const { data, loading, error, refetch } = useFetch<Receipt[]>(
    "/api/orders?status=paid"
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [stornoTarget, setStornoTarget] = useState<Receipt | null>(null);
  const [stornoReason, setStornoReason] = useState("");
  const [stornoBusy, setStornoBusy] = useState(false);

  const receipts = data || [];
  const filtered = receipts.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.invoiceNumber?.toLowerCase().includes(q) ||
      r.table?.name.toLowerCase().includes(q) ||
      r.operator.toLowerCase().includes(q)
    );
  });

  const totalSum = receipts
    .filter((r) => r.status === "paid" && !r.stornoOf)
    .reduce((s, r) => s + r.total, 0);
  const stornoCount = receipts.filter((r) => r.stornoOf).length;

  async function handleStorno() {
    if (!stornoTarget) return;
    if (!stornoReason.trim()) {
      toast.error("Vnesite razlog storna");
      return;
    }
    setStornoBusy(true);
    try {
      const res = await fetch(`/api/orders/${stornoTarget.id}/storno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: stornoReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Napaka");
      }
      toast.success("Račun uspešno storniran in poslan v SRS");
      setStornoTarget(null);
      setStornoReason("");
      refetch();
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri stornu");
    } finally {
      setStornoBusy(false);
    }
  }

  function handlePrint(r: Receipt) {
    setSelected(r);
    // Počakaj da se dialog.rendera, nato sproži print
    setTimeout(() => window.print(), 400);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={refetch}>
          Poskusi znova
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Št. računov</p>
          <p className="mt-1 text-2xl font-bold">{receipts.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Prihodek (brez stornov)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {formatEUR(totalSum)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Storniranih</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stornoCount}</p>
        </Card>
      </div>

      {/* Iskalnik */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Išči po številki računa, mizi ali blagajniku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Seznam računov */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          Ni najdenih računov.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const isStorno = r.stornoOf !== null;
            const storniran = !!r.stornoAt;
            return (
              <Card
                key={r.id}
                className={cn(
                  "p-3 transition-colors",
                  isStorno && "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20",
                  storniran && !isStorno && "opacity-60"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        isStorno
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                      )}
                    >
                      {isStorno ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-mono text-sm font-semibold">
                          {r.invoiceNumber || r.receiptNo}
                        </p>
                        {isStorno && (
                          <Badge
                            variant="outline"
                            className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400"
                          >
                            STORNO
                          </Badge>
                        )}
                        {storniran && !isStorno && (
                          <Badge
                            variant="outline"
                            className="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                          >
                            STORNIRAN
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.table?.name} &middot; {r.operator} &middot;{" "}
                        {r.paidAt ? formatDateTime(r.paidAt) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-bold",
                          isStorno ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                        )}
                      >
                        {formatEUR(r.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.paymentMethod === "card" ? "Kartica" : "Gotovina"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelected(r)}
                        title="Podrobnosti"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePrint(r)}
                        title="Natisni"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      {!isStorno && !storniran && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          onClick={() => setStornoTarget(r)}
                          title="Storniraj"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: podrobnosti računa */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          {selected && (
            <>
              <DialogHeader className="border-b border-border px-5 py-4">
                <DialogTitle className="flex items-center gap-2 font-mono">
                  <FileText className="h-5 w-5 text-amber-600" />
                  {selected.invoiceNumber || selected.receiptNo}
                </DialogTitle>
                <DialogDescription>
                  Račun &middot; {selected.table?.name} &middot;{" "}
                  {selected.paidAt ? formatDateTime(selected.paidAt) : "-"}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-5">
                  <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                    <Row label="Miza" value={selected.table?.name} />
                    <Row label="Blagajnik" value={selected.operator} />
                    <Row
                      label="Način plačila"
                      value={
                        selected.paymentMethod === "card" ? "Kartica" : "Gotovina"
                      }
                    />
                    <Row label="Poslovni prostor" value={selected.businessUnit} />
                    <Row label="Elektronska naprava" value={selected.cashRegister} />
                    <Row
                      label="Vrednost"
                      value={formatEUR(selected.total)}
                      bold
                    />
                    <Row
                      label="DDV"
                      value={formatEUR(selected.vatTotal)}
                    />
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Postavke</h4>
                    <div className="space-y-1.5">
                      {selected.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex justify-between border-b border-dashed border-border py-1 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">
                              {it.quantity}× {it.menuItem.name}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {formatEUR(it.unitPrice)} &middot; DDV{" "}
                              {(it.vatRate * 100).toFixed(1)}%
                            </p>
                          </div>
                          <span className="font-medium">
                            {formatEUR(it.unitPrice * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg border border-border p-3">
                    <h4 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                      FURS fiskalni podatki
                    </h4>
                    <Row
                      label="ZOI"
                      value={selected.zoi}
                      mono
                      wrap
                    />
                    <Row label="EOR" value={selected.eor} mono wrap />
                    {selected.stornoOf && (
                      <Row
                        label="Storno od"
                        value={selected.invoiceNumber}
                        mono
                      />
                    )}
                    {selected.stornoReason && (
                      <Row
                        label="Razlog storna"
                        value={selected.stornoReason}
                      />
                    )}
                    <div className="mt-3 flex flex-col items-center border-t border-dashed border-border pt-3">
                      <FursQrCode
                        orderId={selected.id}
                        className="h-24 w-24"
                        alt="FURS QR koda"
                      />
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        Skeniraj za preverbo na FURS
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="border-t border-border p-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Natisni račun
                </Button>
              </div>

              {/* Print-only poln račun */}
              <div id="printable-receipt" className="hidden bg-white p-4 font-mono text-xs text-neutral-900 print:block">
                <div className="text-center">
                  <p className="font-bold">GOSTILNA PRI MARKU, d.o.o.</p>
                  <p>Glavni trg 1, 1000 Ljubljana</p>
                  <p>Davčna št.: SI12345678</p>
                  <p className="mt-1">
                    Poslovni prostor: {selected.businessUnit} &middot; Blagajna:{" "}
                    {selected.cashRegister}
                  </p>
                  <p className="mt-2 font-bold">
                    {selected.stornoOf ? "STORNO RAČUN" : "RAČUN"}
                  </p>
                </div>
                <div className="my-2 border-t border-dashed border-neutral-400" />
                <div className="flex justify-between">
                  <span>Št. računa:</span>
                  <span className="font-bold">
                    {selected.invoiceNumber || selected.receiptNo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Datum:</span>
                  <span>
                    {selected.paidAt ? formatDateTime(selected.paidAt) : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Miza:</span>
                  <span>{selected.table?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blagajnik:</span>
                  <span>{selected.operator}</span>
                </div>
                {selected.stornoReason && (
                  <div className="flex justify-between">
                    <span>Razlog storna:</span>
                    <span>{selected.stornoReason}</span>
                  </div>
                )}
                <div className="my-2 border-t border-dashed border-neutral-400" />
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
                    {selected.items.map((it) => (
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
                <div className="my-2 border-t border-dashed border-neutral-400" />
                <div className="flex justify-between text-sm font-bold">
                  <span>SKUPAJ:</span>
                  <span>{selected.total.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Plačilo:</span>
                  <span>
                    {selected.paymentMethod === "card" ? "Kartica" : "Gotovina"}
                  </span>
                </div>
                <div className="my-2 border-t border-dashed border-neutral-400" />
                <div className="text-[9px] text-neutral-600">
                  <p className="font-bold text-emerald-700">FURS — SRS fiskaliziran</p>
                  <p className="mt-1 break-all">ZOI: {selected.zoi}</p>
                  <p className="mt-1 break-all">EOR: {selected.eor}</p>
                </div>
                <div className="my-2 border-t border-dashed border-neutral-400" />
                <div className="flex flex-col items-center">
                  <FursQrCode
                    orderId={selected.id}
                    className="h-24 w-24"
                    alt="FURS QR"
                  />
                  <p className="mt-1 text-[8px] text-neutral-500">
                    Skeniraj za preverbo
                  </p>
                </div>
                <div className="my-2 border-t border-dashed border-neutral-400" />
                <div className="text-center text-[10px] text-neutral-600">
                  <p>Hvala za obisk in lep pozdrav!</p>
                  <p className="mt-1">www.gostilnaprimarku.si</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: storno */}
      <Dialog
        open={!!stornoTarget}
        onOpenChange={(o) => {
          if (!o) {
            setStornoTarget(null);
            setStornoReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <RotateCcw className="h-5 w-5" />
              Storno računa
            </DialogTitle>
            <DialogDescription>
              Račun{" "}
              <span className="font-mono font-semibold text-foreground">
                {stornoTarget?.invoiceNumber}
              </span>{" "}
              ({formatEUR(stornoTarget?.total || 0)}) bo storniran preko FURS.
              Dejanje je nepovratno.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Razlog storna</label>
            <Input
              placeholder="npr. Napačno izdan račun"
              value={stornoReason}
              onChange={(e) => setStornoReason(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              FURS zahteva navedbo razloga. Storno račun bo dobil novo
              zaporedno številko in reference na original.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStornoTarget(null);
                setStornoReason("");
              }}
              disabled={stornoBusy}
            >
              Prekliči
            </Button>
            <Button
              className="flex-1 bg-rose-600 hover:bg-rose-700"
              onClick={handleStorno}
              disabled={stornoBusy || !stornoReason.trim()}
            >
              {stornoBusy ? "Storniram..." : "Potrdi storno"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  bold,
  wrap,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  bold?: boolean;
  wrap?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right",
          mono && "font-mono text-[11px]",
          bold && "font-bold",
          wrap && "break-all"
        )}
      >
        {value}
      </span>
    </div>
  );
}
