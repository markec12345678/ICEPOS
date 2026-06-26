"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { formatDateTime } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  UserCircle,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "@/components/pos/pin-login";

interface Operator {
  id: string;
  name: string;
  taxNumber: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export function OperatorsAdminView() {
  const { data, loading, error, refetch } = useFetch<Operator[]>("/api/operators");
  const [editing, setEditing] = useState<Operator | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Operator | null>(null);

  const operators = data || [];

  async function toggleActive(op: Operator) {
    try {
      const res = await fetch(`/api/operators/${op.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !op.active }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(op.active ? "Operater deaktiviran" : "Operater aktiviran");
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Operaterji</h2>
          <p className="text-xs text-muted-foreground">
            Upravljanje blagajnikov (FURS sledljivost)
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-1.5 h-4 w-4" />
          Nov operater
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-medium">Ni operaterjev</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {operators.map((op) => (
            <Card
              key={op.id}
              className={cn(
                "p-4",
                !op.active && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full",
                      op.role === "admin"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {op.role === "admin" ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <UserCircle className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{op.name}</p>
                      {op.role === "admin" && (
                        <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {!op.active && (
                        <Badge variant="outline" className="border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                          Neaktiven
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Davčna: {op.taxNumber} · Dodan: {formatDateTime(op.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(op)}
                    className="h-8"
                  >
                    {op.active ? "Deaktiviraj" : "Aktiviraj"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setEditing(op)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => setDeleting(op)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold">FURS opomba</p>
            <p className="mt-1">
              Vsak račun mora vsebovati davčno številko operaterja, ki ga je izdal.
              V produkciji bodo operaterji povezani s FURS INI registracijo naprave.
              PIN naj bo vsaj 4-mesten in naj se redno spreminja.
            </p>
          </div>
        </div>
      </Card>

      {(creating || editing) && (
        <OperatorDialog
          operator={editing}
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
              <DialogTitle className="text-rose-600">Izbriši operaterja</DialogTitle>
              <DialogDescription>
                Ali res želiš izbrisati <strong>{deleting.name}</strong>?
                Njegovi računi ostanejo v evidenci, vendar se ne bo mogel več prijaviti.
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
                    const res = await fetch(`/api/operators/${deleting.id}`, {
                      method: "DELETE",
                      headers: authHeaders(),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    toast.success("Operater izbrisan");
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

function OperatorDialog({
  operator,
  onClose,
  onSaved,
}: {
  operator: Operator | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(operator?.name || "");
  const [pin, setPin] = useState("");
  const [taxNumber, setTaxNumber] = useState(operator?.taxNumber || "SI12345678");
  const [role, setRole] = useState(operator?.role || "cashier");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Ime je obvezno");
      return;
    }
    if (!operator && pin.length !== 4) {
      toast.error("PIN mora biti 4-mesten");
      return;
    }
    setSaving(true);
    try {
      const url = operator ? `/api/operators/${operator.id}` : "/api/operators";
      const method = operator ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name: name.trim(),
        taxNumber: taxNumber.trim(),
        role,
      };
      if (pin) body.pin = pin;

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Napaka");
      toast.success(operator ? "Operater posodobljen" : "Operater ustvarjen");
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
            <UserCircle className="h-5 w-5 text-amber-600" />
            {operator ? "Uredi operaterja" : "Nov operater"}
          </DialogTitle>
          <DialogDescription>
            {operator
              ? `Spremeni podatke za ${operator.name}`
              : "Dodaj novega blagajnika ali admina"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="name">Ime in priimek *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="npr. Ana Novak"
            />
          </div>
          <div>
            <Label htmlFor="pin">
              PIN {operator ? "(pusti prazno za ohranitev)" : "* (4 števke)"}
            </Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
          </div>
          <div>
            <Label htmlFor="tax">Davčna številka</Label>
            <Input
              id="tax"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="SI12345678"
            />
          </div>
          <div>
            <Label>Vloga</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cashier">Blagajnik</SelectItem>
                <SelectItem value="admin">Admin (doda/briše operaterje)</SelectItem>
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
