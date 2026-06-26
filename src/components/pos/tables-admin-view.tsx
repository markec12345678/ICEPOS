"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LayoutGrid,
  Plus,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";

interface Table {
  id: string;
  number: number;
  name: string;
  seats: number;
  section: string;
}

export function TablesAdminView() {
  const { data, loading, refetch } = useFetch<Table[]>("/api/tables");
  const [editing, setEditing] = useState<Table | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Table | null>(null);

  const tables = data || [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mize</h2>
          <p className="text-xs text-muted-foreground">
            Tloris lokala — dodajaj, urejaj, briši mize
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Nova miza
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <Card className="p-8 text-center">
          <LayoutGrid className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ni miz</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t) => (
            <Card key={t.id} className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{t.section}</p>
                  <h4 className="text-base font-bold">{t.name}</h4>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {t.seats} oseb
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Št. {t.number}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => setEditing(t)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => setDeleting(t)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TableDialog
          table={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refetch();
          }}
        />
      )}

      {deleting && (
        <Dialog open onOpenChange={(o) => !o && setDeleting(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-rose-600">Izbriši mizo</DialogTitle>
              <DialogDescription>
                Ali res želiš izbrisati <strong>{deleting.name}</strong> (št. {deleting.number})?
                Zgodovinski računi ostanejo, miza pa izgine iz tlorisa.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Prekliči
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/tables-admin/${deleting.id}`, {
                      method: "DELETE",
                      headers: authHeaders(),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success("Miza izbrisana");
                    setDeleting(null);
                    refetch();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Izbriši
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TableDialog({
  table,
  onClose,
  onSaved,
}: {
  table: Table | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [number, setNumber] = useState(String(table?.number || ""));
  const [name, setName] = useState(table?.name || "");
  const [seats, setSeats] = useState(String(table?.seats || 4));
  const [section, setSection] = useState(table?.section || "Dvorana");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!number || !name.trim()) {
      toast.error("Številka in ime sta obvezna");
      return;
    }
    setSaving(true);
    try {
      const url = table ? `/api/tables-admin/${table.id}` : "/api/tables-admin";
      const method = table ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify({
          number: parseInt(number, 10),
          name: name.trim(),
          seats: parseInt(seats, 10),
          section,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success(table ? "Miza posodobljena" : "Miza ustvarjena");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-amber-600" />
            {table ? "Uredi mizo" : "Nova miza"}
          </DialogTitle>
          <DialogDescription>
            {table ? table.name : "Dodaj mizo v tloris lokala"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label htmlFor="num">Številka *</Label>
            <Input
              id="num"
              type="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="name">Ime *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Miza 1"
            />
          </div>
          <div>
            <Label htmlFor="seats">Št. oseb</Label>
            <Input
              id="seats"
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
          <div>
            <Label>Sekcija</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dvorana">Dvorana</SelectItem>
                <SelectItem value="Terasa">Terasa</SelectItem>
                <SelectItem value="Zasebna">Zasebna</SelectItem>
                <SelectItem value="Bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Prekliči
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
