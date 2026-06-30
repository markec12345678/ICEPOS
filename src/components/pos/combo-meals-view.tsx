"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Utensils,
  Plus,
  Trash2,
  Edit,
  Layers,
  GripVertical,
  Save,
  X,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR, CATEGORIES, type MenuItem } from "@/lib/types";

interface ComboSlot {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  itemIds: string; // JSON array
}

interface ComboMeal {
  id: string;
  name: string;
  description: string | null;
  price: number;
  icon: string | null;
  active: boolean;
  slots: ComboSlot[];
}

interface SlotEditor {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  itemIds: string[];
}

function parseItemIds(s: string): string[] {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

export function ComboMealsView() {
  const [combos, setCombos] = useState<ComboMeal[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ComboMeal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [combosRes, menuRes] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/menu"),
      ]);
      setCombos(await combosRes.json());
      setMenuItems(await menuRes.json());
    } catch {
      toast.error("Napaka pri nalaganju combo-jev");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(combo: ComboMeal) {
    try {
      const res = await fetch(`/api/combos/${combo.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !combo.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(combo.active ? "Onemogočeno" : "Omogočeno");
      load();
    } catch {
      toast.error("Napaka");
    }
  }

  async function deleteCombo(combo: ComboMeal) {
    if (!confirm(`Izbriši "${combo.name}"?`)) return;
    try {
      const res = await fetch(`/api/combos/${combo.id}`, {
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
        <div className="text-muted-foreground">Nalagam combo menije...</div>
      </div>
    );
  }

  // Izračunaj "vrednost" combo-ja (vsota posameznih item-ov)
  function comboValue(combo: ComboMeal): number {
    let total = 0;
    for (const slot of combo.slots) {
      const ids = parseItemIds(slot.itemIds);
      // Vzamemo najdražji item v slot-u kot primer
      const items = ids.map((id) => menuItems.find((m) => m.id === id)).filter(Boolean) as MenuItem[];
      if (items.length > 0) {
        const maxPrice = Math.max(...items.map((m) => m.price));
        total += maxPrice * slot.minSelect;
      }
    }
    return total;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Combo meniji</h2>
          <p className="text-sm text-muted-foreground">
            Set meniji z izbiro pod-itemov — fiksna cena nižja od vsote posameznih
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setEditOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nov combo
        </Button>
      </div>

      {combos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Layers className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Ni combo menijev</p>
          <p className="text-sm text-muted-foreground">
            Ustvari combo (npr. "Lunch meni: juha + glavna + pijača = 15€") za 10% povečanje povprečnega računa.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {combos.map((combo) => {
            const value = comboValue(combo);
            const savings = value - combo.price;
            const savingsPct = value > 0 ? Math.round((savings / value) * 100) : 0;
            return (
              <Card key={combo.id} className={`p-4 ${!combo.active ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{combo.icon || "🍽️"}</span>
                      <h3 className="font-semibold">{combo.name}</h3>
                      {combo.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          Aktivno
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Neaktivno</Badge>
                      )}
                    </div>
                    {combo.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{combo.description}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">{formatEUR(combo.price)}</span>
                      {value > combo.price && (
                        <span className="text-sm text-muted-foreground line-through">{formatEUR(value)}</span>
                      )}
                      {savingsPct > 0 && (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                          -{savingsPct}%
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      {combo.slots.map((slot) => {
                        const ids = parseItemIds(slot.itemIds);
                        return (
                          <div key={slot.id} className="flex items-center gap-2 text-xs">
                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{slot.name}</span>
                            <span className="text-muted-foreground">
                              ({slot.minSelect}-{slot.maxSelect} izbira, {ids.length} opcij)
                            </span>
                            {!slot.required && (
                              <Badge variant="outline" className="text-[10px]">opcijsko</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Switch
                      checked={combo.active}
                      onCheckedChange={() => toggleActive(combo)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => { setEditing(combo); setEditOpen(true); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteCombo(combo)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kako delujejo combo meniji?</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>• <strong>Slot</strong>: kategorija izbire (npr. "Izberi 1 juho" z 3 opcijami).</p>
          <p>• <strong>minSelect/maxSelect</strong>: koliko item-ov mora/lahko gost izbere.</p>
          <p>• <strong>Cena</strong>: fiksna, nižja od vsote posameznih (npr. 15€ namesto 18€).</p>
          <p>• <strong>Inventory</strong>: ob plačilu se vsi izbrani item-i samodejno odštejejo.</p>
          <p>• <strong>ROI</strong>: 10% povečanje povprečnega računa (upselling).</p>
        </div>
      </Card>

      <ComboDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        menuItems={menuItems}
        onSaved={load}
      />
    </div>
  );
}

// ============================================================
// Combo Dialog — create/edit
// ============================================================

function ComboDialog({
  open,
  onOpenChange,
  editing,
  menuItems,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ComboMeal | null;
  menuItems: MenuItem[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("🍽️");
  const [slots, setSlots] = useState<SlotEditor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description || "");
        setPrice(String(editing.price));
        setIcon(editing.icon || "🍽️");
        setSlots(
          editing.slots.map((s) => ({
            name: s.name,
            required: s.required,
            minSelect: s.minSelect,
            maxSelect: s.maxSelect,
            itemIds: parseItemIds(s.itemIds),
          }))
        );
      } else {
        setName("");
        setDescription("");
        setPrice("");
        setIcon("🍽️");
        setSlots([{ name: "Izberi jed", required: true, minSelect: 1, maxSelect: 1, itemIds: [] }]);
      }
    }
  }, [open, editing]);

  function addSlot() {
    setSlots([...slots, { name: "Nova izbira", required: true, minSelect: 1, maxSelect: 1, itemIds: [] }]);
  }

  function removeSlot(idx: number) {
    setSlots(slots.filter((_, i) => i !== idx));
  }

  function updateSlot(idx: number, field: keyof SlotEditor, value: unknown) {
    setSlots(slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  function toggleItemInSlot(slotIdx: number, itemId: string) {
    setSlots(
      slots.map((s, i) => {
        if (i !== slotIdx) return s;
        const exists = s.itemIds.includes(itemId);
        return {
          ...s,
          itemIds: exists ? s.itemIds.filter((id) => id !== itemId) : [...s.itemIds, itemId],
        };
      })
    );
  }

  async function save() {
    if (!name || !price || slots.length === 0) {
      toast.error("Manjkajoči podatki");
      return;
    }
    if (slots.some((s) => s.itemIds.length === 0)) {
      toast.error("Vsak slot mora imeti vsaj 1 item");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        price: parseFloat(price),
        icon,
        slots: slots.map((s) => ({
          name: s.name,
          required: s.required,
          minSelect: s.minSelect,
          maxSelect: s.maxSelect,
          itemIds: s.itemIds,
        })),
      };

      const url = editing ? `/api/combos/${editing.id}` : "/api/combos";
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Uredi combo" : "Nov combo meni"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[60px_1fr] gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Ikona</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="text-center text-2xl"
                maxLength={2}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Ime</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Lunch meni 1"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Opis (opcijsko)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="npr. Juha + glavna jed + pijača"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-sm">Cena combo-ja (EUR)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="15.00"
            />
          </div>

          {/* Slots */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-medium">Izbire (slots)</Label>
              <Button variant="outline" size="sm" onClick={addSlot}>
                <Plus className="mr-1 h-3 w-3" />
                Dodaj izbiro
              </Button>
            </div>
            <div className="space-y-3">
              {slots.map((slot, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Input
                      value={slot.name}
                      onChange={(e) => updateSlot(idx, "name", e.target.value)}
                      placeholder="Ime izbire (npr. Juha)"
                      className="flex-1"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <Switch
                        checked={slot.required}
                        onCheckedChange={(v) => updateSlot(idx, "required", v)}
                      />
                      Obvezno
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeSlot(idx)}
                      disabled={slots.length === 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-1 block text-xs">Min izbire</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={slot.minSelect}
                        onChange={(e) => updateSlot(idx, "minSelect", parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Max izbire</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={slot.maxSelect}
                        onChange={(e) => updateSlot(idx, "maxSelect", parseInt(e.target.value) || 1)}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">
                      Item-i v izbiri ({slot.itemIds.length} izbranih)
                    </Label>
                    <div className="max-h-32 overflow-y-auto rounded border p-2">
                      {CATEGORIES.map((cat) => {
                        const catItems = menuItems.filter((m) => m.category === cat.id);
                        if (catItems.length === 0) return null;
                        return (
                          <div key={cat.id} className="mb-2">
                            <p className="text-xs font-medium text-muted-foreground">{cat.icon} {cat.label}</p>
                            <div className="flex flex-wrap gap-1">
                              {catItems.map((m) => {
                                const selected = slot.itemIds.includes(m.id);
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleItemInSlot(idx, m.id)}
                                    className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                                      selected
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-muted"
                                    }`}
                                  >
                                    {m.name} ({formatEUR(m.price)})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
