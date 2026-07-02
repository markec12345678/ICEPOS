"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Phone,
  Clock,
  Plus,
  Bell,
  Check,
  X,
  Trash2,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNow } from "@/hooks/use-now";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";

interface WaitlistEntry {
  id: string;
  customerName: string;
  phone: string | null;
  partySize: number;
  status: string;
  estimatedWait: number | null;
  note: string | null;
  tableId: string | null;
  notified: boolean;
  notifiedAt: string | null;
  seatedAt: string | null;
  createdAt: string;
  elapsedMinutes: number;
}

export function WaitlistView() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPartySize, setNewPartySize] = useState("2");
  const [newEstWait, setNewEstWait] = useState("");
  const [newNote, setNewNote] = useState("");
  const now = useNow(30000);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/waitlist?status=waiting");
      if (!res.ok) throw new Error("Napaka");
      const data = await res.json();
      setEntries(data);
    } catch {
      // tiha napaka
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function addEntry() {
    if (!newName.trim()) {
      toast.error("Vnesi ime stranke");
      return;
    }
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newName,
          phone: newPhone || undefined,
          partySize: parseInt(newPartySize) || 2,
          estimatedWait: newEstWait ? parseInt(newEstWait) : undefined,
          note: newNote || undefined,
        }),
      });
      if (!res.ok) throw new Error("Napaka");
      playFeedbackSound("info");
      toast.success(`${newName} dodan/a v čakalno vrsto`);
      setNewName("");
      setNewPhone("");
      setNewPartySize("2");
      setNewEstWait("");
      setNewNote("");
      setShowAdd(false);
      load();
    } catch {
      toast.error("Napaka pri dodajanju");
    }
  }

  async function updateStatus(id: string, status: string, tableId?: string) {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, tableId }),
      });
      if (!res.ok) throw new Error("Napaka");
      if (status === "seated") {
        playFeedbackSound("success");
        toast.success("Stranka sedeła!");
      }
      load();
    } catch {
      toast.error("Napaka pri posodobitvi");
    }
  }

  async function notifyGuest(id: string, name: string) {
    try {
      const res = await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notified: true }),
      });
      if (!res.ok) throw new Error("Napaka");
      playFeedbackSound("info");
      toast.success(`📱 Obvestilo poslano: ${name}`, {
        description: "Stranka je obveščena, da je miza pripravljena",
      });
      load();
    } catch {
      toast.error("Napaka pri pošiljanju obvestila");
    }
  }

  async function deleteEntry(id: string) {
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Napaka");
      toast.success("Vnos izbrisan");
      load();
    } catch {
      toast.error("Napaka pri brisanju");
    }
  }

  const waiting = entries.filter((e) => e.status === "waiting");
  const totalPeople = waiting.reduce((s, e) => s + e.partySize, 0);
  const avgWait = waiting.length > 0
    ? Math.round(waiting.reduce((s, e) => s + e.elapsedMinutes, 0) / waiting.length)
    : 0;

  function getUrgencyColor(elapsed: number): string {
    if (elapsed >= 30) return "text-rose-600 dark:text-rose-400";
    if (elapsed >= 15) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Čakalna vrsta</h2>
          <p className="text-xs text-muted-foreground">
            Upravljaj goste, ki čakajo na prosto mizo
          </p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} className="bg-amber-600 hover:bg-amber-700">
          <UserPlus className="mr-1.5 h-4 w-4" />
          {showAdd ? "Skrij" : "Dodaj gosta"}
        </Button>
      </div>

      {/* Stat kartice */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">V čakanju</p>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{waiting.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Skupno oseb</p>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{totalPeople}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Povp. čakanje</p>
            <Clock className="h-4 w-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {avgWait}m
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Obveščeni</p>
            <Bell className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {waiting.filter((e) => e.notified).length}
          </p>
        </Card>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Nov vnos v čakalno vrsto</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Ime stranke *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Janez Novak"
                onKeyDown={(e) => e.key === "Enter" && addEntry()}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Telefon</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="031 234 567"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Št. oseb</label>
              <Input
                type="number"
                min={1}
                value={newPartySize}
                onChange={(e) => setNewPartySize(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Predviden čakanje (min)</label>
              <Input
                type="number"
                value={newEstWait}
                onChange={(e) => setNewEstWait(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Opomba</label>
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="alergije, posebne želje..."
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={addEntry} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-1.5 h-4 w-4" />
              Dodaj v čakalno vrsto
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Prekliči
            </Button>
          </div>
        </Card>
      )}

      {/* Čakalna vrsta */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : waiting.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Čakalna vrsta je prazna</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dodaj goste, ki čakajo na prosto mizo.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {waiting.map((entry, i) => (
            <Card
              key={entry.id}
              className={cn(
                "p-4 transition-all",
                entry.notified && "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10",
                entry.elapsedMinutes >= 30 && "border-rose-300 dark:border-rose-800"
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {/* Position number */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{entry.customerName}</p>
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        {entry.partySize}
                      </Badge>
                      {entry.notified && (
                        <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs">
                          <Bell className="h-3 w-3" />
                          Obveščen
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {entry.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {entry.phone}
                        </span>
                      )}
                      <span className={cn("flex items-center gap-1 font-semibold", getUrgencyColor(entry.elapsedMinutes))}>
                        <Clock className="h-3 w-3" />
                        čaka {entry.elapsedMinutes}m
                      </span>
                      {entry.estimatedWait && (
                        <span>· ocena: {entry.estimatedWait}m</span>
                      )}
                      {entry.note && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          · 📝 {entry.note}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Akcije */}
                <div className="flex gap-1.5">
                  {!entry.notified && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => notifyGuest(entry.id, entry.customerName)}
                      title="Pošlji obvestilo"
                      className="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950/30"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1">Obvesti</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => updateStatus(entry.id, "seated")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    title="Označi kot sedelega"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1">Sedel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(entry.id, "left")}
                    title="Stranka odšla"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteEntry(entry.id)}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                    title="Izbriši"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Urgency warning */}
              {entry.elapsedMinutes >= 30 && (
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-rose-50 p-1.5 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                  <AlertCircle className="h-3 w-3" />
                  Dolgo čakanje ({entry.elapsedMinutes}m) — razmisli o kompenzaciji ali pospešitvi
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
