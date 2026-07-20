"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  AlertTriangle,
  Calendar,
  Euro,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Training {
  id: string;
  operatorId: string | null;
  operatorName: string;
  title: string;
  category: string;
  description: string | null;
  trainingDate: string;
  durationHours: number;
  status: string;
  completedDate: string | null;
  score: number | null;
  maxScore: number;
  passed: boolean;
  certificate: string | null;
  validUntil: string | null;
  cost: number;
  trainer: string | null;
  note: string | null;
}

interface Summary {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  expired: number;
  passed: number;
  avgScore: number;
  totalCost: number;
  totalHours: number;
  expiringSoon: number;
}

interface Operator {
  id: string;
  name: string;
  role: string;
}

interface TrainingsData {
  trainings: Training[];
  summary: Summary;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_safety: "Higiena hrane",
  service: "Strežba",
  safety: "Varnost",
  compliance: "Skladnost",
  technical: "Tehnično",
  soft_skills: "Komunikacija",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  completed: {
    label: "Zaključeno",
    icon: CheckCircle2,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  scheduled: {
    label: "Načrtovano",
    icon: Clock,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  cancelled: {
    label: "Preklicano",
    icon: XCircle,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
  expired: {
    label: "Poteklo",
    icon: AlertTriangle,
    className:
      "border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function TrainingView() {
  const [data, setData] = useState<TrainingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Training | null>(null);

  const [form, setForm] = useState({
    operatorId: "",
    title: "",
    category: "food_safety",
    description: "",
    trainingDate: new Date().toISOString().slice(0, 10),
    durationHours: 1,
    status: "scheduled",
    score: "",
    maxScore: 100,
    passed: false,
    certificate: "",
    validUntil: "",
    cost: 0,
    trainer: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const url = `/api/trainings${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju usposabljanj");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (addDialogOpen) {
      fetch("/api/operators", { headers: authHeaders() })
        .then((r) => r.json())
        .then((ops) => setOperators(Array.isArray(ops) ? ops : []))
        .catch(() => setOperators([]));
    }
  }, [addDialogOpen]);

  function openEdit(item: Training) {
    setEditItem(item);
    setForm({
      operatorId: item.operatorId || "",
      title: item.title,
      category: item.category,
      description: item.description || "",
      trainingDate: item.trainingDate.slice(0, 10),
      durationHours: item.durationHours,
      status: item.status,
      score: item.score !== null ? String(item.score) : "",
      maxScore: item.maxScore,
      passed: item.passed,
      certificate: item.certificate || "",
      validUntil: item.validUntil?.slice(0, 10) || "",
      cost: item.cost,
      trainer: item.trainer || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      operatorId: "",
      title: "",
      category: "food_safety",
      description: "",
      trainingDate: new Date().toISOString().slice(0, 10),
      durationHours: 1,
      status: "scheduled",
      score: "",
      maxScore: 100,
      passed: false,
      certificate: "",
      validUntil: "",
      cost: 0,
      trainer: "",
      note: "",
    });
    setEditItem(null);
  }

  async function saveTraining() {
    if (!form.title) {
      toast.error("Naslov je obvezen");
      return;
    }
    try {
      const payload = {
        ...form,
        score: form.score ? Number(form.score) : null,
        operatorId: form.operatorId || null,
      };
      const url = editItem ? `/api/trainings/${editItem.id}` : "/api/trainings";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Usposabljanje posodobljeno" : "✓ Usposabljanje dodano");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteTraining(id: string) {
    if (!confirm("Ali res želiš izbrisati to usposabljanje?")) return;
    try {
      const res = await fetch(`/api/trainings/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Usposabljanje izbrisano");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Usposabljanja</h2>
          <p className="text-sm text-muted-foreground">Sledenje usposabljanj zaposlenih</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCap className="h-6 w-6 text-purple-600" />
            Usposabljanja
          </h2>
          <p className="text-sm text-muted-foreground">
            Sledenje usposabljanj in certifikatov zaposlenih
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo usposabljanje
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <GraduationCap className="h-8 w-8 text-purple-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Zaključena</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.completed}</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                pov. ocena: {s.avgScore.toFixed(1)}%
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupni strošek</p>
              <p className="text-2xl font-bold">{formatEUR(s.totalCost)}</p>
              <p className="text-xs text-muted-foreground">{s.totalHours} ur skupaj</p>
            </div>
            <Euro className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-amber-700 dark:text-amber-300">Kmalu poteče</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{s.expiringSoon}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-600/60" />
          </div>
        </Card>
      </div>

      {/* Filtri */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsi statusi</SelectItem>
            <SelectItem value="completed">Zaključena</SelectItem>
            <SelectItem value="scheduled">Načrtovana</SelectItem>
            <SelectItem value="cancelled">Preklicana</SelectItem>
            <SelectItem value="expired">Potekla</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Kategorija" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vse kategorije</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seznam */}
      {data.trainings.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Ni usposabljanj"
          description="Dodaj prvo usposabljanje z gumbom zgoraj"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.trainings.map((t) => {
            const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.scheduled;
            const StatusIcon = cfg.icon;
            const isExpiring = t.validUntil && daysUntil(t.validUntil) <= 30 && daysUntil(t.validUntil) >= 0;
            const isExpired = t.validUntil && daysUntil(t.validUntil) < 0;
            return (
              <Card key={t.id} className="flex flex-col p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{t.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[t.category] || t.category}
                    </p>
                  </div>
                  <Badge variant="outline" className={cfg.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {cfg.label}
                  </Badge>
                </div>

                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium">Zaposleni:</span> {t.operatorName}
                  </p>
                  <p>
                    <span className="font-medium">Datum:</span> {formatDate(t.trainingDate)}
                  </p>
                  <p>
                    <span className="font-medium">Trajanje:</span> {t.durationHours} ur
                  </p>
                  {t.trainer && (
                    <p>
                      <span className="font-medium">Izvajalec:</span> {t.trainer}
                    </p>
                  )}
                  {t.cost > 0 && (
                    <p>
                      <span className="font-medium">Strošek:</span> {formatEUR(t.cost)}
                    </p>
                  )}
                </div>

                {/* Rezultat */}
                {t.status === "completed" && t.score !== null && (
                  <div className="mb-3 rounded border bg-muted/20 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rezultat:</span>
                      <span className={`font-bold ${t.passed ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.score}/{t.maxScore}
                        {t.passed ? " ✓" : " ✗"}
                      </span>
                    </div>
                    {t.certificate && (
                      <p className="mt-1 flex items-center gap-1 text-purple-600">
                        <Award className="h-3 w-3" />
                        {t.certificate}
                      </p>
                    )}
                  </div>
                )}

                {/* Validnost */}
                {t.validUntil && (
                  <div className="mb-3 text-xs">
                    {isExpired ? (
                      <Badge variant="outline" className="text-rose-600">
                        Poteklo: {formatDate(t.validUntil)}
                      </Badge>
                    ) : isExpiring ? (
                      <Badge variant="outline" className="text-amber-600">
                        Poteče čez {daysUntil(t.validUntil)} dni
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600">
                        Velj do {formatDate(t.validUntil)}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Akcije */}
                <div className="mt-auto flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTraining(t.id)}
                    className="text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi usposabljanje" : "Novo usposabljanje"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Naslov *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="npr. Higiena hrane - HACCP"
                />
              </div>
              <div>
                <Label>Kategorija</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zaposleni</Label>
                <Select
                  value={form.operatorId}
                  onValueChange={(v) => setForm({ ...form, operatorId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vsi zaposleni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Vsi zaposleni</SelectItem>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>
                        {op.name} ({op.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={form.trainingDate}
                  onChange={(e) => setForm({ ...form, trainingDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Trajanje (ur)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={form.durationHours}
                  onChange={(e) => setForm({ ...form, durationHours: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Načrtovano</SelectItem>
                    <SelectItem value="completed">Zaključeno</SelectItem>
                    <SelectItem value="cancelled">Preklicano</SelectItem>
                    <SelectItem value="expired">Poteklo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Izvajalec</Label>
                <Input
                  value={form.trainer}
                  onChange={(e) => setForm({ ...form, trainer: e.target.value })}
                  placeholder="npr. Zavod za zdravje"
                />
              </div>
            </div>

            {form.status === "completed" && (
              <div className="grid grid-cols-2 gap-3 rounded border bg-muted/20 p-3">
                <div>
                  <Label>Ocena</Label>
                  <Input
                    type="number"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <Label>Maks. ocena</Label>
                  <Input
                    type="number"
                    value={form.maxScore}
                    onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="passed"
                    checked={form.passed}
                    onChange={(e) => setForm({ ...form, passed: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="passed" className="cursor-pointer">Uspešno opravljeno</Label>
                </div>
                <div className="col-span-2">
                  <Label>Potrdilo / certifikat</Label>
                  <Input
                    value={form.certificate}
                    onChange={(e) => setForm({ ...form, certificate: e.target.value })}
                    placeholder="npr. Certifikat št. 12345"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Veljavnost do</Label>
                  <Input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Strošek (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Opomba</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Prekliči</Button>
            <Button onClick={saveTraining} className="bg-purple-600 hover:bg-purple-700">
              {editItem ? "Shrani" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
