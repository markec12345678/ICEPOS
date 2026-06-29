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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Calendar,
  Percent,
  Euro,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { CATEGORIES, formatEUR } from "@/lib/types";

interface HappyHour {
  id: string;
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  categories: string;
  menuItemIds: string;
  active: boolean;
}

const DAYS = [
  { id: 1, label: "Pon" },
  { id: 2, label: "Tor" },
  { id: 3, label: "Sre" },
  { id: 4, label: "Čet" },
  { id: 5, label: "Pet" },
  { id: 6, label: "Sob" },
  { id: 0, label: "Ned" },
];

function parseDays(s: string): number[] {
  try {
    return JSON.parse(s);
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

function parseCategories(s: string): string[] {
  if (s === "all") return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

function daysLabel(s: string): string {
  const days = parseDays(s);
  if (days.length === 7) return "Vsak dan";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return "Pon–Pet";
  if (days.length === 2 && days.includes(6) && days.includes(0)) return "Vikend";
  return days.map((d) => DAYS.find((x) => x.id === d)?.label).filter(Boolean).join(", ");
}

function categoriesLabel(s: string): string {
  if (s === "all") return "Vse kategorije";
  const cats = parseCategories(s);
  if (cats.length === 0) return "Vse kategorije";
  return cats
    .map((c) => CATEGORIES.find((cat) => cat.id === c)?.label || c)
    .join(", ");
}

export function HappyHourView() {
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<HappyHour | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/happy-hours");
      if (!res.ok) throw new Error("Napaka");
      setHappyHours(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju happy hour pravil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(hh: HappyHour) {
    try {
      const res = await fetch(`/api/happy-hours/${hh.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !hh.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(hh.active ? "Onemogočeno" : "Omogočeno");
      load();
    } catch {
      toast.error("Napaka");
    }
  }

  async function deleteHH(hh: HappyHour) {
    if (!confirm(`Izbriši "${hh.name}"?`)) return;
    try {
      const res = await fetch(`/api/happy-hours/${hh.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      toast.success("Izbrisano");
      load();
    } catch {
      toast.error("Napaka");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Nalagam...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Happy Hour</h2>
          <p className="text-sm text-muted-foreground">
            Časovno odvisne cene — avtomatski popusti ob določenih urah
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setEditOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo pravilo
        </Button>
      </div>

      {happyHours.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Sparkles className="mb-3 h-12 w-12 text-amber-500" />
          <p className="font-medium">Ni happy hour pravil</p>
          <p className="text-sm text-muted-foreground">
            Ustvari pravilo za avtomatske popuste ob določenih urah (npr. pijača -30% 16-18h).
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {happyHours.map((hh) => (
            <Card key={hh.id} className={`p-4 ${!hh.active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{hh.name}</h3>
                    {hh.active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        Aktivno
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Neaktivno</Badge>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {hh.startTime} – {hh.endTime}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {daysLabel(hh.daysOfWeek)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hh.discountType === "percent" ? (
                        <Percent className="h-3.5 w-3.5" />
                      ) : (
                        <Euro className="h-3.5 w-3.5" />
                      )}
                      <span className="font-semibold text-amber-600">
                        -{hh.discountValue}{hh.discountType === "percent" ? "%" : "€"}
                      </span>
                    </div>
                    <div className="text-xs">
                      📂 {categoriesLabel(hh.categories)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Switch
                    checked={hh.active}
                    onCheckedChange={() => toggleActive(hh)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditing(hh); setEditOpen(true); }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteHH(hh)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako deluje Happy Hour?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Samodejno</strong> se popust aplicira ob aktivnih urah v POS in javnem meniju.</p>
          <p>• <strong>Percent</strong>: odstotek od cene (npr. 30% = -30%). <strong>Fixed</strong>: fiksni znesek v EUR.</p>
          <p>• <strong>Kategorije</strong>: omeji na določene kategorije (npr. samo pijača).</p>
          <p>• <strong>Dnevi</strong>: izberi katere dni v tednu velja (pon-pet, vikend, vsak dan).</p>
          <p>• <strong>ROI</strong>: 15-30% povečanje prometa v mrtvih urah (16-18h).</p>
        </div>
      </Card>

      <HappyHourDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        onSaved={load}
      />
    </div>
  );
}

// ============================================================
// Dialog za dodajanje/urejanje
// ============================================================

function HappyHourDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: HappyHour | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("30");
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDays(parseDays(editing.daysOfWeek));
        setStartTime(editing.startTime);
        setEndTime(editing.endTime);
        setDiscountType(editing.discountType);
        setDiscountValue(String(editing.discountValue));
        setCategories(parseCategories(editing.categories));
      } else {
        setName("");
        setDays([1, 2, 3, 4, 5]);
        setStartTime("16:00");
        setEndTime("18:00");
        setDiscountType("percent");
        setDiscountValue("30");
        setCategories([]);
      }
    }
  }, [open, editing]);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function save() {
    if (!name || days.length === 0) {
      toast.error("Manjkajoči podatki");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        daysOfWeek: days,
        startTime,
        endTime,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        categories: categories.length === 0 ? "all" : categories,
      };

      const url = editing
        ? `/api/happy-hours/${editing.id}`
        : "/api/happy-hours";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(editing ? "Posodobljeno" : "Ustvarjeno");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Napaka");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Uredi happy hour" : "Novo happy hour pravilo"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">Ime</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Happy Hour, Popoldanski popust..."
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Dnevi v tednu</Label>
            <div className="flex flex-wrap gap-1">
              {DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDay(d.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    days.includes(d.id)
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Od</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Do</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Tip popusta</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Odstotek (%)</SelectItem>
                  <SelectItem value="fixed">Fiksni znesek (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Vrednost</Label>
              <Input
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">
              Kategorije (prazno = vse)
            </Label>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCategory(c.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    categories.includes(c.id)
                      ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="text-xs text-muted-foreground">Predogled:</p>
            <p className="font-medium">
              {name || "Happy Hour"} • {startTime}–{endTime} • {daysLabel(JSON.stringify(days))}
            </p>
            <p className="text-amber-600">
              Popust: -{discountValue}{discountType === "percent" ? "%" : "€"}{" "}
              {categories.length > 0 && `(${categories.length} kategorij)`}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
