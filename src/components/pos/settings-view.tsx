"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Building2,
  ShieldCheck,
  Save,
  RotateCcw,
  Database,
  Info,
  KeyRound,
  CreditCard,
  Smartphone,
  Bike,
  Truck,
  CalendarCheck,
  Bell,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

const STORAGE_KEY = "icepos-si-settings";

interface Settings {
  // Podjetje
  companyName: string;
  taxNumber: string;
  address: string;
  postalCode: string;
  city: string;
  // FURS
  businessPremiseID: string;
  electronicDeviceID: string;
  fursEnv: "test" | "prod";
  fursCertUploaded: boolean;
  // Blagajnik
  operatorName: string;
  operatorTaxNumber: string;
}

const DEFAULTS: Settings = {
  companyName: "Gostilna Pri Marku, d.o.o.",
  taxNumber: "12345678",
  address: "Glavni trg 1",
  postalCode: "1000",
  city: "Ljubljana",
  businessPremiseID: "PREVOZ11",
  electronicDeviceID: "BLAG01",
  fursEnv: "test",
  fursCertUploaded: false,
  operatorName: "Ana",
  operatorTaxNumber: "SI12345678",
};

export function SettingsView() {
  // Lazy initial state — prebere localStorage enkrat ob mount-u (brez setState v effect)
  const [s, setS] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULTS;
  });

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      toast.success("Nastavitve shranjene", {
        description: "Podatki so shranjeni lokalno v brskalniku.",
      });
    } catch {
      toast.error("Napaka pri shranjevanju");
    }
  }

  function reset() {
    setS(DEFAULTS);
    localStorage.removeItem(STORAGE_KEY);
    toast.info("Nastavitve ponastavljene na privzete vrednosti");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Nastavitve</h2>
          <p className="text-xs text-muted-foreground">
            Podatki podjetja in FURS konfiguracija
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Ponastavi
          </Button>
          <Button onClick={save} className="bg-amber-600 hover:bg-amber-700">
            <Save className="mr-2 h-4 w-4" />
            Shrani
          </Button>
        </div>
      </div>

      {/* Podjetje */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Podjetje</h3>
            <p className="text-xs text-muted-foreground">
              Podatki izdajatelja računa
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Naziv podjetja</Label>
            <Input
              id="companyName"
              value={s.companyName}
              onChange={(e) => update("companyName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="taxNumber">Davčna številka</Label>
            <Input
              id="taxNumber"
              value={s.taxNumber}
              onChange={(e) => update("taxNumber", e.target.value)}
              placeholder="12345678"
              maxLength={8}
            />
          </div>
          <div>
            <Label htmlFor="address">Naslov</Label>
            <Input
              id="address"
              value={s.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Poštna številka</Label>
            <Input
              id="postalCode"
              value={s.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="city">Kraj</Label>
            <Input
              id="city"
              value={s.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* FURS */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">FURS konfiguracija</h3>
            <p className="text-xs text-muted-foreground">
              SRS fiskalizacija računov
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
          >
            POC
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="bpId">Oznaka poslovnega prostora</Label>
            <Input
              id="bpId"
              value={s.businessPremiseID}
              onChange={(e) => update("businessPremiseID", e.target.value)}
              placeholder="PREVOZ11"
            />
          </div>
          <div>
            <Label htmlFor="edId">Oznaka elektronske naprave</Label>
            <Input
              id="edId"
              value={s.electronicDeviceID}
              onChange={(e) => update("electronicDeviceID", e.target.value)}
              placeholder="BLAG01"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-3">
          <Label>FURS certifikat (.p12)</Label>
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {s.fursCertUploaded
                      ? "Certifikat naložen (demo)"
                      : "Certifikat ni naložen"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.fursCertUploaded
                      ? "Uporablja se demo RSA ključ"
                      : "Za produkcijo naloži DATI certifikat"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  update("fursCertUploaded", !s.fursCertUploaded);
                  toast.info(
                    s.fursCertUploaded
                      ? "Certifikat odstranjen"
                      : "Demo certifikat aktiven"
                  );
                }}
              >
                {s.fursCertUploaded ? "Odstrani" : "Naloži (demo)"}
              </Button>
            </div>
          </div>

          <div>
            <Label>Okolje</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update("fursEnv", "test")}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  s.fursEnv === "test"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                    : "border-border hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">Test</p>
                <p className="text-xs text-muted-foreground">
                  blagajne-test.fu.gov.si
                </p>
              </button>
              <button
                onClick={() => update("fursEnv", "prod")}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  s.fursEnv === "prod"
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                    : "border-border hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">Produkcija</p>
                <p className="text-xs text-muted-foreground">
                  blagajne.fu.gov.si
                </p>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Blagajnik */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Blagajnik</h3>
            <p className="text-xs text-muted-foreground">
              Podatki o trenutnem operaterju
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="opName">Ime blagajnika</Label>
            <Input
              id="opName"
              value={s.operatorName}
              onChange={(e) => update("operatorName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="opTax">Davčna št. blagajnika</Label>
            <Input
              id="opTax"
              value={s.operatorTaxNumber}
              onChange={(e) => update("operatorTaxNumber", e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Integrations status */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">Integracije</h3>
            <p className="text-xs text-muted-foreground">
              Status vseh integracij in povezav
            </p>
          </div>
        </div>
        <IntegrationsPanel />
      </Card>

      {/* Info */}
      <Card className="border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Opomba o POC stanju</p>
            <p className="mt-1">
              Aplikacija trenutno uporablja <strong>demo RSA ključ</strong> za
              ZOI izračun in <strong>demo UUID</strong> za EOR. Za produkcijo
              moraš naložiti pravi FURS certifikat (.p12) in implementirati
              klic FURS REST API-ja za pridobitev pravega EOR-ja. Nastavitve se
              shranjujejo lokalno v brskalniku (localStorage) — v produkciji
              jih premakni v zavarovan backend.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Integrations Panel — status vseh integracij
// ============================================================

interface IntegrationStatus {
  configured: boolean;
  env?: string;
  message?: string;
}

function IntegrationsPanel() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      const results: Record<string, IntegrationStatus> = {};

      // FURS
      try {
        const res = await fetch("/api/furs/status");
        if (res.ok) {
          const data = await res.json();
          results.furs = { configured: data.configured, env: data.env, message: data.mode };
        }
      } catch { results.furs = { configured: false }; }

      // Sumup
      results.sumup = { configured: false, message: "Nastavi SUMUP_API_KEY v .env" };

      // Stripe
      try {
        const res = await fetch("/api/stripe/publishable-key");
        if (res.ok) {
          const data = await res.json();
          results.stripe = { configured: data.configured };
        }
      } catch { results.stripe = { configured: false }; }

      // Wolt
      try {
        const res = await fetch("/api/wolt/status");
        if (res.ok) {
          const data = await res.json();
          results.wolt = { configured: data.configured, env: data.env };
        }
      } catch { results.wolt = { configured: false }; }

      // Deliverect
      try {
        const res = await fetch("/api/deliverect/status");
        if (res.ok) {
          const data = await res.json();
          results.deliverect = { configured: data.configured, env: data.env };
        }
      } catch { results.deliverect = { configured: false }; }

      // OpenTable
      try {
        const res = await fetch("/api/opentable/status");
        if (res.ok) {
          const data = await res.json();
          results.opentable = { configured: data.configured };
        }
      } catch { results.opentable = { configured: false }; }

      setStatuses(results);
      setLoading(false);
    }
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const integrations = [
    { id: "furs", name: "FURS fiskalizacija", icon: ShieldCheck, desc: "ZOI, EOR, XML, QR koda" },
    { id: "sumup", name: "Sumup terminal", icon: Smartphone, desc: "Plačilni terminal" },
    { id: "stripe", name: "Apple Pay / Google Pay", icon: CreditCard, desc: "Stripe Terminal (NFC)" },
    { id: "wolt", name: "Wolt dostava", icon: Bike, desc: "Webhook + avto naročila" },
    { id: "deliverect", name: "Deliverect (8 platform)", icon: Truck, desc: "UberEats, DoorDash, Glovo, itd." },
    { id: "opentable", name: "OpenTable/Resy", icon: CalendarCheck, desc: "Sinhronizacija rezervacij" },
  ];

  return (
    <div className="space-y-2">
      {integrations.map((int) => {
        const status = statuses[int.id] || { configured: false };
        const Icon = int.icon;
        return (
          <div
            key={int.id}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              status.configured
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/10"
                : "border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  status.configured
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{int.name}</p>
                <p className="text-xs text-muted-foreground">{int.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status.env && (
                <Badge variant="outline" className="text-xs">
                  {status.env}
                </Badge>
              )}
              {status.configured ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Povezan
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400">
                  <XCircle className="mr-1 h-3 w-3" />
                  Ni konfiguriran
                </Badge>
              )}
            </div>
          </div>
        );
      })}
      <p className="pt-2 text-xs text-muted-foreground">
        💡 Nastavi API ključe v .env datoteki. Po spremembi restartaj aplikacijo.
      </p>
    </div>
  );
}
