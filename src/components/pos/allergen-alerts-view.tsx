"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import { authHeaders } from "@/components/pos/pin-login";
import { formatEUR } from "@/lib/types";
import { LoadingSpinner, EmptyState } from "@/components/pos/loading-states";

interface MatchingAllergen {
  key: string;
  label: string;
  icon: string;
}

interface DangerousItem {
  menuItemId: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  matchingAllergens: MatchingAllergen[];
  allAllergens: string[];
}

interface CustomerAlert {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  allergens: MatchingAllergen[];
  dangerousItemsCount: number;
  dangerousItems: DangerousItem[];
  safeItemsCount: number;
  severity: "high" | "medium" | "low";
}

interface AllergenSummaryItem {
  key: string;
  label: string;
  icon: string;
  affectedCustomers: number;
  affectedItems: number;
  riskLevel: string;
}

interface AlertsData {
  alerts: CustomerAlert[];
  allergenSummary: AllergenSummaryItem[];
  summary: {
    totalCustomersWithAllergies: number;
    totalCustomers: number;
    totalAlerts: number;
    highRiskCustomers: number;
    mediumRiskCustomers: number;
    lowRiskCustomers: number;
    totalDangerousItems: number;
    avgDangerousPerCustomer: number;
  };
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  high: {
    label: "Visoko tveganje",
    className:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  },
  medium: {
    label: "Srednje tveganje",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  },
  low: {
    label: "Nizko tveganje",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
};

export function AllergenAlertsView() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerAlert | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/allergen-alerts", { headers: authHeaders() });
      if (!res.ok) throw new Error("Napaka");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Napaka pri nalaganju obvestil o alergenih");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Obvestila o alergenih</h2>
          <p className="text-sm text-muted-foreground">Spremljanje alergij strank</p>
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
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
          Obvestila o alergenih
        </h2>
        <p className="text-sm text-muted-foreground">
          Spremljanje alergij strank in identifikacija nevarnih jedi
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Stranke z alergijami
              </p>
              <p className="text-2xl font-bold">{s.totalCustomersWithAllergies}</p>
              <p className="text-xs text-muted-foreground">
                od {s.totalCustomers} skupaj
              </p>
            </div>
            <Users className="h-8 w-8 text-rose-600/40" />
          </div>
        </Card>
        <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-rose-700 dark:text-rose-300">
                Visoko tveganje
              </p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {s.highRiskCustomers}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-rose-600/60" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Skupno nevarnih kombinacij
              </p>
              <p className="text-2xl font-bold">{s.totalDangerousItems}</p>
              <p className="text-xs text-muted-foreground">
                pov. {s.avgDangerousPerCustomer.toFixed(1)} / stranko
              </p>
            </div>
            <ShieldAlert className="h-8 w-8 text-amber-600/40" />
          </div>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-emerald-700 dark:text-emerald-300">
                Nizko tveganje
              </p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {s.lowRiskCustomers}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600/60" />
          </div>
        </Card>
      </div>

      {/* Povzetek po alergenih */}
      {data.allergenSummary.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Alergeni v sistemu</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.allergenSummary.map((a) => (
              <div
                key={a.key}
                className={`rounded border p-3 ${
                  a.riskLevel === "high"
                    ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30"
                    : "border-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{a.icon}</span>
                  {a.riskLevel === "high" && (
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  )}
                </div>
                <p className="mt-1 text-sm font-medium">{a.label}</p>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>{a.affectedCustomers} strank</span>
                  <span>{a.affectedItems} jedi</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Seznam strank z alergijami */}
      {data.alerts.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Ni strank z alergijami"
          description="Dodaj alergene strankam v CRM modulu"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/50 p-4">
            <h3 className="font-semibold">Stranke z alergijami</h3>
          </div>
          <div className="divide-y">
            {data.alerts.map((alert) => (
              <button
                key={alert.customerId}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/30"
                onClick={() => setSelected(alert)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30">
                    <Users className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-medium">{alert.customerName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {alert.allergens.map((a) => (
                        <span
                          key={a.key}
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                        >
                          {a.icon} {a.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant="outline" className={SEVERITY_CONFIG[alert.severity].className}>
                      {SEVERITY_CONFIG[alert.severity].label}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.dangerousItemsCount} nevarnih jedi · {alert.safeItemsCount} varnih
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              {selected?.customerName}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {/* Kontakt */}
              <div className="grid grid-cols-2 gap-3 rounded border p-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Telefon</p>
                  {selected.customerPhone ? (
                    <a href={`tel:${selected.customerPhone}`} className="flex items-center gap-1 font-medium text-blue-600">
                      <Phone className="h-3 w-3" />
                      {selected.customerPhone}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  {selected.customerEmail ? (
                    <a href={`mailto:${selected.customerEmail}`} className="flex items-center gap-1 font-medium text-blue-600">
                      <Mail className="h-3 w-3" />
                      {selected.customerEmail}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>

              {/* Alergeni */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Alergeni stranke
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.allergens.map((a) => (
                    <Badge
                      key={a.key}
                      variant="outline"
                      className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                      {a.icon} {a.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Nevarne jedi */}
              {selected.dangerousItems.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-rose-700 dark:text-rose-300">
                    ⚠ Nevarne jedi ({selected.dangerousItems.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selected.dangerousItems.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="rounded border border-rose-200 bg-rose-50/50 p-2 text-sm dark:border-rose-800 dark:bg-rose-950/20"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatEUR(item.price)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.matchingAllergens.map((a) => (
                            <span
                              key={a.key}
                              className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                            >
                              {a.icon} {a.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Varno za uživanje */}
              <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {selected.safeItemsCount} jedi je varnih za to stranko
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
