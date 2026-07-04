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
  FileDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Mail,
  Send,
  Filter,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FursQrCode } from "@/components/pos/furs-qr-code";
import { usePosStore } from "@/stores/pos-store";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";
import { toUserFriendlyError } from "@/lib/errors";
import { usePrint } from "@/hooks/use-print";

type Receipt = Order & {
  items: { id: string; menuItem: { id: string; name: string; price: number; vatRate: number }; quantity: number; unitPrice: number; vatRate: number; note?: string | null }[];
};

export function ReceiptsView() {
  const { data, loading, error, refetch } = useFetch<Receipt[]>(
    "/api/orders?status=paid"
  );
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card" | "giftcard">("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [showStornoOnly, setShowStornoOnly] = useState(false);
  const [showTipsOnly, setShowTipsOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [stornoTarget, setStornoTarget] = useState<Receipt | null>(null);
  const [stornoReason, setStornoReason] = useState("");
  const [stornoBusy, setStornoBusy] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Receipt | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const receipts = data || [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = receipts.filter((r) => {
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(
        r.invoiceNumber?.toLowerCase().includes(q) ||
        r.table?.name.toLowerCase().includes(q) ||
        r.operator.toLowerCase().includes(q)
      )) return false;
    }

    // Date filter
    if (dateFilter !== "all" && r.paidAt) {
      const paidDate = new Date(r.paidAt);
      if (dateFilter === "today" && paidDate < todayStart) return false;
      if (dateFilter === "yesterday" && (paidDate < yesterdayStart || paidDate >= todayStart)) return false;
      if (dateFilter === "week" && paidDate < weekStart) return false;
      if (dateFilter === "month" && paidDate < monthStart) return false;
    }

    // Payment method filter
    if (paymentFilter !== "all" && r.paymentMethod !== paymentFilter) return false;

    // Amount range filter
    const min = parseFloat(minAmount) || 0;
    const max = parseFloat(maxAmount) || Infinity;
    if (r.total < min || r.total > max) return false;

    // Storno only
    if (showStornoOnly && !r.stornoOf) return false;

    // Tips only
    if (showTipsOnly && (!r.tip || r.tip <= 0)) return false;

    return true;
  });

  const validReceipts = receipts.filter((r) => r.status === "paid" && !r.stornoOf);
  const totalSum = validReceipts.reduce((s, r) => s + r.total, 0);
  const stornoCount = receipts.filter((r) => r.stornoOf).length;
  const tipsSum = validReceipts.reduce((s, r) => s + (r.tip || 0), 0);
  const avgOrder = validReceipts.length > 0 ? totalSum / validReceipts.length : 0;

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

  async function sendEmail() {
    if (!emailTarget || !emailAddress) return;
    setEmailBusy(true);
    try {
      const res = await fetch(`/api/orders/${emailTarget.id}/email-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Napaka");
      }
      toast.success(`Račun poslan na ${emailAddress}`, {
        description: emailTarget.invoiceNumber,
      });
      setEmailTarget(null);
      setEmailAddress("");
    } catch (e) {
      toast.error((e as Error).message || "Napaka pri pošiljanju");
    } finally {
      setEmailBusy(false);
    }
  }

  function handlePrint(r: Receipt) {
    setSelected(r);
    // Uporabi robustni print z retry in queue
    setTimeout(() => doPrint(), 500);
  }

  // Quick re-order iz računa — doda vse postavke v košarico
  const { addCartItem, setActiveView, selectTable } = usePosStore();
  const { print: doPrint } = usePrint();

  async function handleReorder(r: Receipt) {
    try {
      if (!r.items || r.items.length === 0) {
        toast.error("Račun nima postavk za ponovitev");
        return;
      }

      let added = 0;
      let skipped = 0;
      for (const item of r.items) {
        try {
          // Pridobi podatke o jedi iz API-ja
          const res = await fetch(`/api/menu/${item.menuItem.id}`);
          if (!res.ok) {
            skipped++;
            continue;
          }
          const menuItem = await res.json();
          if (!menuItem.available) {
            skipped++;
            continue;
          }
          addCartItem(
            {
              id: menuItem.id,
              name: menuItem.name,
              nameEn: menuItem.nameEn || undefined,
              category: menuItem.category,
              price: menuItem.price,
              vatRate: menuItem.vatRate,
              available: true,
              desc: menuItem.desc,
              descEn: menuItem.descEn,
              allergens: menuItem.allergens,
              calories: menuItem.calories,
              protein: menuItem.protein,
              carbs: menuItem.carbs,
              fat: menuItem.fat,
              isFavorite: menuItem.isFavorite,
              isDailySpecial: menuItem.isDailySpecial,
              imageUrl: menuItem.imageUrl,
              createdAt: menuItem.createdAt,
            },
            item.quantity,
            [],
            item.note || undefined
          );
          added++;
        } catch {
          skipped++;
        }
      }

      if (added > 0) {
        playFeedbackSound("success");
        toast.success(`Ponovljeno naročilo: ${added} postavk${skipped > 0 ? ` (${skipped} preskokljenih)` : ""}`, {
          description: r.invoiceNumber || r.receiptNo,
          duration: 4000,
          action: {
            label: "Pojdi na naročilo",
            onClick: () => {
              if (r.tableId) {
                selectTable(r.tableId);
              } else {
                setActiveView("order");
              }
            },
          },
        });
      } else {
        toast.error("Ni bilo mogoče ponoviti naročila", {
          description: "Nobena postavka ni več na voljo",
        });
      }
    } catch (e) {
      const friendly = toUserFriendlyError(e);
      toast.error(friendly.title, { description: friendly.description });
    }
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
    <div className="space-y-4 animate-fade-in">
      {/* Header z izvozom */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Računi</h2>
          <p className="text-xs text-muted-foreground">
            Dnevnik izdanih računov z FURS podatki
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10);
            window.open(
              `/api/orders/export?from=${today}&to=${today}`,
              "_blank"
            );
            toast.success("Pripravljam CSV izvoz za računovodstvo");
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Izvozi CSV
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Št. računov</p>
          <p className="mt-1 text-2xl font-bold">{receipts.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Prihodek</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {formatEUR(totalSum)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Povp. račun</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {formatEUR(avgOrder)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Napitnine</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {formatEUR(tipsSum)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Storniranih</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{stornoCount}</p>
        </Card>
      </div>

      {/* Iskalnik + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči po številki računa, mizi ali blagajniku..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("shrink-0", showFilters && "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400")}
          title="Napredni filtri"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Napredni filtri */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Datum:</span>
              {(["all", "today", "yesterday", "week", "month"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs transition-colors",
                    dateFilter === d ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {d === "all" ? "Vsi" : d === "today" ? "Danes" : d === "yesterday" ? "Včeraj" : d === "week" ? "Teden" : "Mesec"}
                </button>
              ))}
            </div>

            {/* Payment filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Plačilo:</span>
              {(["all", "cash", "card", "giftcard"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPaymentFilter(p)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs transition-colors",
                    paymentFilter === p ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {p === "all" ? "Vsi" : p === "cash" ? "Gotovina" : p === "card" ? "Kartica" : "Darilna"}
                </button>
              ))}
            </div>
          </div>

          {/* Amount range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Znesek:</span>
            <Input
              type="number"
              placeholder="min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-7 w-20 text-xs"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-7 w-20 text-xs"
            />
            <span className="text-xs text-muted-foreground">€</span>

            {/* Toggles */}
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showStornoOnly}
                onChange={(e) => setShowStornoOnly(e.target.checked)}
                className="h-3 w-3"
              />
              Samo storno
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={showTipsOnly}
                onChange={(e) => setShowTipsOnly(e.target.checked)}
                className="h-3 w-3"
              />
              Z napitnino
            </label>

            {/* Clear */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setDateFilter("all");
                setPaymentFilter("all");
                setMinAmount("");
                setMaxAmount("");
                setShowStornoOnly(false);
                setShowTipsOnly(false);
              }}
            >
              Počisti
            </Button>
          </div>

          {/* Result count */}
          <p className="text-xs text-muted-foreground">
            Prikazano: <strong>{filtered.length}</strong> od {receipts.length} računov
          </p>
        </div>
      )}

      {/* Seznam računov */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Receipt className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {search.trim() ? "Ni najdenih računov" : "Še ni izdanih računov"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search.trim()
                ? "Poskusite spremeniti iskalni niz."
                : "Računi se bodo prikazali po prvem zaključenem plačilu."}
            </p>
          </div>
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
                  "p-3 transition-all duration-200 hover:shadow-sm",
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
                      {!isStorno && !storniran && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                          onClick={() => handleReorder(r)}
                          title="Ponovi naročilo"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <a
                        href={`/print/receipt/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Natisni / Shrani PDF"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePrint(r)}
                        title="Natisni"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/40"
                        onClick={() => {
                          setEmailTarget(r);
                          setEmailAddress("");
                        }}
                        title="Pošlji na email"
                      >
                        <Mail className="h-4 w-4" />
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

      {/* Email dialog */}
      <Dialog open={!!emailTarget} onOpenChange={(o) => !o && setEmailTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-sky-600" />
              Pošlji račun na email
            </DialogTitle>
            <DialogDescription>
              Račun {emailTarget?.invoiceNumber} ({formatEUR(emailTarget?.total || 0)}) bo poslan na vneseni email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email naslovnik</label>
              <Input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="gost@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && emailAddress && !emailBusy) {
                    sendEmail();
                  }
                }}
              />
            </div>
            <div className="rounded-lg bg-sky-50 p-3 text-xs text-sky-700 dark:bg-sky-950/30 dark:text-sky-400">
              <p className="font-semibold">📧 Račun bo vseboval:</p>
              <ul className="mt-1 space-y-0.5">
                <li>• PDF prilogo z računom</li>
                <li>• QR kodo za FURS</li>
                <li>• Vse postavke in cene</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEmailTarget(null)} disabled={emailBusy}>
              Prekliči
            </Button>
            <Button
              onClick={sendEmail}
              disabled={emailBusy || !emailAddress}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {emailBusy ? (
                "Pošiljam..."
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Pošlji
                </>
              )}
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
