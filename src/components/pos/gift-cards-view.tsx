"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatEUR, formatDateTime } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Gift,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/components/pos/pin-login";
import { toast } from "sonner";

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initialAmount: number;
  status: string;
  customerName: string | null;
  note: string | null;
  createdAt: string;
}

export function GiftCardsView() {
  const { data, loading, refetch } = useFetch<GiftCard[]>("/api/gift-cards");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newAmount, setNewAmount] = useState("50");
  const [newName, setNewName] = useState("");
  const [checkCode, setCheckCode] = useState("");
  const [checkResult, setCheckResult] = useState<GiftCard | null>(null);
  const [checkError, setCheckError] = useState("");

  const cards = data || [];
  const filtered = search.trim()
    ? cards.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          (c.customerName || "").toLowerCase().includes(search.toLowerCase())
      )
    : cards;

  const totalActive = cards
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + c.balance, 0);
  const totalIssued = cards.reduce((s, c) => s + c.initialAmount, 0);

  async function createCard() {
    const amount = parseFloat(newAmount);
    if (!amount || amount <= 0) {
      toast.error("Vnesi veljaven znesek");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/gift-cards", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          amount,
          customerName: newName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Gift card ustvarjena: ${data.code}`, {
        description: `${formatEUR(data.balance)} — ${data.customerName || "Brez imena"}`,
      });
      setNewAmount("50");
      setNewName("");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function checkCard() {
    if (!checkCode.trim()) return;
    setCheckError("");
    setCheckResult(null);
    try {
      const res = await fetch(`/api/gift-cards/${checkCode.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setCheckError(data.error || "Ni najden");
        return;
      }
      setCheckResult(data);
    } catch {
      setCheckError("Napaka pri iskanju");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Darilne kartice</h2>
        <p className="text-xs text-muted-foreground">
          Ustvari, preveri in upravljaj darilne kartice
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Skupaj izdanih</p>
          <p className="mt-1 text-2xl font-bold">{cards.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Aktivno stanje</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {formatEUR(totalActive)}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Skupaj izdano</p>
          <p className="mt-1 text-2xl font-bold">{formatEUR(totalIssued)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Porabljenih</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">
            {cards.filter((c) => c.status === "used").length}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ustvari novo */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <Plus className="h-4 w-4 text-amber-600" />
            Ustvari darilno kartico
          </h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="gc-amount">Znesek (EUR)</Label>
              <Input
                id="gc-amount"
                type="number"
                step="5"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <div className="mt-2 flex gap-1.5">
                {[25, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setNewAmount(String(amt))}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                  >
                    {amt}€
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="gc-name">Prejemnik (opcijsko)</Label>
              <Input
                id="gc-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="npr. Janez Novak"
              />
            </div>
            <Button
              onClick={createCard}
              disabled={creating}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Gift className="mr-2 h-4 w-4" />
              {creating ? "Ustvarjam..." : "Ustvari kartico"}
            </Button>
          </div>
        </Card>

        {/* Preveri stanje */}
        <Card className="p-5">
          <h3 className="mb-4 flex items-center gap-2 font-bold">
            <Search className="h-4 w-4 text-sky-600" />
            Preveri stanje kartice
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="GC-XXXXXXXX"
                value={checkCode}
                onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
                className="font-mono"
                onKeyDown={(e) => e.key === "Enter" && checkCard()}
              />
              <Button onClick={checkCard} variant="outline">
                Preveri
              </Button>
            </div>
            {checkError && (
              <p className="flex items-center gap-1.5 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {checkError}
              </p>
            )}
            {checkResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="font-mono font-bold">{checkResult.code}</span>
                  {checkResult.status === "active" ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                      Aktivna
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                      Porabljena
                    </Badge>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stanje</span>
                    <span className="font-bold text-emerald-600">
                      {formatEUR(checkResult.balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Začetni znesek</span>
                    <span>{formatEUR(checkResult.initialAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Seznam kartic */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border p-4">
          <h3 className="font-bold">Vse darilne kartice ({cards.length})</h3>
        </div>
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Išči po kodi ali imenu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Gift className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">Ni darilnih kartic</p>
            <p className="text-xs text-muted-foreground">
              Ustvari novo kartico zgoraj.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-2">Koda</th>
                  <th className="px-4 py-2">Prejemnik</th>
                  <th className="px-4 py-2 text-right">Stanje</th>
                  <th className="px-4 py-2 text-right">Začetno</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Datum</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                      {c.code}
                    </td>
                    <td className="px-4 py-3">{c.customerName || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatEUR(c.balance)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatEUR(c.initialAmount)}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "active" ? (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          Aktivna
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                          Porabljena
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                        onClick={async () => {
                          if (!confirm("Izbriši kartico?")) return;
                          await fetch(`/api/gift-cards/${c.id}`, { method: "DELETE" });
                          toast.success("Kartica izbrisana");
                          refetch();
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
