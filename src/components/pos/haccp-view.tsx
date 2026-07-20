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
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Star,
  ClipboardCheck,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface Inspection {
  id: string;
  type: string;
  inspector: string | null;
  inspectionDate: string;
  nextInspectionDate: string | null;
  cleanlinessScore: number;
  foodHandlingScore: number;
  storageScore: number;
  temperatureScore: number;
  documentationScore: number;
  pestControlScore: number;
  overallScore: number;
  status: string;
  findings: string | null;
  recommendations: string | null;
  correctiveActions: string | null;
  note: string | null;
}

interface Summary {
  total: number;
  passed: number;
  conditional: number;
  failed: number;
  avgScore: number;
  upcomingInspections: number;
  overdueInspections: number;
}

interface HaccpData {
  inspections: Inspection[];
  summary: Summary;
}

const TYPE_LABELS: Record<string, string> = {
  routine: "Redni pregled",
  follow_up: "Nadzor",
  complaint: "Pritožba",
  self_audit: "Samokontrola",
  official: "Uradni pregled",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  passed: {
    label: "Uspešno",
    icon: CheckCircle2,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  conditional: {
    label: "Pogojno",
    icon: AlertTriangle,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  failed: {
    label: "Neuspešno",
    icon: XCircle,
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
};

const SCORE_AREAS = [
  { key: "cleanlinessScore", label: "Čistoča" },
  { key: "foodHandlingScore", label: "Ravnanje s hrano" },
  { key: "storageScore", label: "Skladiščenje" },
  { key: "temperatureScore", label: "Temperature" },
  { key: "documentationScore", label: "Dokumentacija" },
  { key: "pestControlScore", label: "Kontrola škodljivcev" },
] as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("sl-SI");
}

export function HaccpView() {
  const [data, setData] = useState<HaccpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Inspection | null>(null);
  const [detailItem, setDetailItem] = useState<Inspection | null>(null);

  const [form, setForm] = useState({
    type: "routine",
    inspector: "",
    inspectionDate: new Date().toISOString().slice(0, 10),
    nextInspectionDate: "",
    cleanlinessScore: 5,
    foodHandlingScore: 5,
    storageScore: 5,
    temperatureScore: 5,
    documentationScore: 5,
    pestControlScore: 5,
    findings: "",
    recommendations: "",
    correctiveActions: "",
    note: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = `/api/haccp${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju pregledov");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openEdit(item: Inspection) {
    setEditItem(item);
    setForm({
      type: item.type,
      inspector: item.inspector || "",
      inspectionDate: item.inspectionDate.slice(0, 10),
      nextInspectionDate: item.nextInspectionDate?.slice(0, 10) || "",
      cleanlinessScore: item.cleanlinessScore,
      foodHandlingScore: item.foodHandlingScore,
      storageScore: item.storageScore,
      temperatureScore: item.temperatureScore,
      documentationScore: item.documentationScore,
      pestControlScore: item.pestControlScore,
      findings: item.findings || "",
      recommendations: item.recommendations || "",
      correctiveActions: item.correctiveActions || "",
      note: item.note || "",
    });
    setAddDialogOpen(true);
  }

  function resetForm() {
    setForm({
      type: "routine",
      inspector: "",
      inspectionDate: new Date().toISOString().slice(0, 10),
      nextInspectionDate: "",
      cleanlinessScore: 5,
      foodHandlingScore: 5,
      storageScore: 5,
      temperatureScore: 5,
      documentationScore: 5,
      pestControlScore: 5,
      findings: "",
      recommendations: "",
      correctiveActions: "",
      note: "",
    });
    setEditItem(null);
  }

  async function saveInspection() {
    try {
      const url = editItem ? `/api/haccp/${editItem.id}` : "/api/haccp";
      const method = editItem ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success(editItem ? "✓ Pregled posodobljen" : "✓ Pregled dodan");
      setAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri shranjevanju");
    }
  }

  async function deleteInspection(id: string) {
    if (!confirm("Ali res želiš izbrisati ta pregled?")) return;
    try {
      const res = await fetch(`/api/haccp/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Napaka");
      }
      toast.success("✓ Pregled izbrisan");
      setDetailItem(null);
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Napaka pri brisanju");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">HACCP pregledi</h2>
          <p className="text-sm text-muted-foreground">Zdravstveni in higienski pregledi</p>
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
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
            HACCP pregledi
          </h2>
          <p className="text-sm text-muted-foreground">
            Zdravstveni in higienski pregledi — skladnost z HACCP standardi
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddDialogOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov pregled
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Skupaj pregledov</p>
              <p className="text-2xl font-bold">{s.total}</p>
            </div>
            <ClipboardCheck className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">Uspešni</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{s.passed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Pov. ocena</p>
              <p className="flex items-center gap-1 text-2xl font-bold text-amber-600">
                {s.avgScore.toFixed(1)}
                <Star className="h-5 w-5 fill-current" />
              </p>
            </div>
            <Star className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">Zapadli</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.overdueInspections}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                + {s.upcomingInspections} kmalu
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Vsi statusi</SelectItem>
          <SelectItem value="passed">Uspešni</SelectItem>
          <SelectItem value="conditional">Pogojni</SelectItem>
          <SelectItem value="failed">Neuspešni</SelectItem>
        </SelectContent>
      </Select>

      {/* Seznam pregledov */}
      {data.inspections.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Ni pregledov"
          description="Dodaj prvi HACCP pregled z gumbom zgoraj"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="px-3 py-3 text-left font-semibold">Datum</th>
                  <th className="px-3 py-3 text-left font-semibold">Tip</th>
                  <th className="px-3 py-3 text-left font-semibold">Inšpektor</th>
                  <th className="px-3 py-3 text-right font-semibold">Ocena</th>
                  <th className="px-3 py-3 text-left font-semibold">Naslednji</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.inspections.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.passed;
                  const StatusIcon = cfg.icon;
                  const isOverdue = item.nextInspectionDate &&
                    new Date(item.nextInspectionDate) < new Date();
                  return (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/30"
                      onClick={() => setDetailItem(item)}
                    >
                      <td className="px-3 py-3 text-xs text-muted-foreground">
                        {formatDate(item.inspectionDate)}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {TYPE_LABELS[item.type] || item.type}
                      </td>
                      <td className="px-3 py-3 text-xs">{item.inspector || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="flex items-center justify-end gap-1">
                          <span className="font-bold text-amber-600">
                            {item.overallScore.toFixed(1)}
                          </span>
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {item.nextInspectionDate ? (
                          <span className={isOverdue ? "text-rose-600" : "text-muted-foreground"}>
                            {formatDate(item.nextInspectionDate)}
                            {isOverdue && " (zapadlo)"}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="outline" className={cfg.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Uredi pregled" : "Nov HACCP pregled"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Tip pregleda *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Inšpektor</Label>
                <Input
                  value={form.inspector}
                  onChange={(e) => setForm({ ...form, inspector: e.target.value })}
                  placeholder="npr. Zavod za zdravje"
                />
              </div>
              <div>
                <Label>Datum pregleda</Label>
                <Input
                  type="date"
                  value={form.inspectionDate}
                  onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Naslednji pregled</Label>
                <Input
                  type="date"
                  value={form.nextInspectionDate}
                  onChange={(e) => setForm({ ...form, nextInspectionDate: e.target.value })}
                />
              </div>
            </div>

            {/* Ocene področij */}
            <div>
              <Label>Ocene področij (1-5)</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SCORE_AREAS.map((area) => (
                  <div key={area.key} className="rounded border p-2">
                    <p className="mb-1 text-xs font-medium">{area.label}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setForm({ ...form, [area.key]: star })}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              star <= form[area.key]
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Ugotovitve</Label>
              <Textarea
                value={form.findings}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Priporočila</Label>
              <Textarea
                value={form.recommendations}
                onChange={(e) => setForm({ ...form, recommendations: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Korektivni ukrepi</Label>
              <Textarea
                value={form.correctiveActions}
                onChange={(e) => setForm({ ...form, correctiveActions: e.target.value })}
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
            <Button onClick={saveInspection} className="bg-emerald-600 hover:bg-emerald-700">
              {editItem ? "Shrani" : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {TYPE_LABELS[detailItem?.type || ""] || "Pregled"}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Datum</p>
                  <p className="font-medium">{formatDate(detailItem.inspectionDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Inšpektor</p>
                  <p className="font-medium">{detailItem.inspector || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Naslednji pregled</p>
                  <p className="font-medium">{formatDate(detailItem.nextInspectionDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={STATUS_CONFIG[detailItem.status]?.className}>
                    {STATUS_CONFIG[detailItem.status]?.label}
                  </Badge>
                </div>
              </div>

              {/* Ocene */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Ocene področij</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCORE_AREAS.map((area) => {
                    const score = detailItem[area.key] as number;
                    return (
                      <div key={area.key} className="flex items-center justify-between rounded border p-2 text-sm">
                        <span>{area.label}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= score
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between rounded border bg-muted/20 p-2">
                  <span className="font-semibold">Skupna ocena:</span>
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    {detailItem.overallScore.toFixed(1)}
                    <Star className="h-4 w-4 fill-current" />
                  </span>
                </div>
              </div>

              {detailItem.findings && (
                <div className="rounded border p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Ugotovitve</p>
                  <p>{detailItem.findings}</p>
                </div>
              )}
              {detailItem.recommendations && (
                <div className="rounded border p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Priporočila</p>
                  <p>{detailItem.recommendations}</p>
                </div>
              )}
              {detailItem.correctiveActions && (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="mb-1 text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">
                    Korektivni ukrepi
                  </p>
                  <p>{detailItem.correctiveActions}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setDetailItem(null); openEdit(detailItem); }}>
                  <Edit className="mr-1.5 h-4 w-4" />
                  Uredi
                </Button>
                <Button variant="outline" className="text-rose-600" onClick={() => deleteInspection(detailItem.id)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Izbriši
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
