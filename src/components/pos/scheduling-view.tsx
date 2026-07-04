"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  Plus,
  Trash2,
  Play,
  Square,
  Users,
  TrendingUp,
  DollarSign,
  Timer,
  Coins,
  Activity,
} from "lucide-react";
import { formatEUR } from "@/lib/types";
import { LaborCostTracker } from "@/components/pos/labor-cost-tracker";
import { TipDistribution } from "@/components/pos/tip-distribution";

// ============================================================
// Tipi
// ============================================================

interface Operator {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
  pin: string;
}

interface Schedule {
  id: string;
  operatorId: string;
  operator: Operator;
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  note: string | null;
}

interface Timesheet {
  id: string;
  operatorId: string;
  operator: Operator;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
}

interface LaborCost {
  date: string;
  totalMinutes: number;
  totalHours: number;
  totalCost: number;
  revenue: number;
  tips: number;
  laborCostPercent: number;
  activeEmployees: number;
  totalEmployees: number;
  perOperator: {
    operatorId: string;
    operatorName: string;
    hourlyRate: number;
    minutes: number;
    cost: number;
    clockIn: string;
    clockOut: string | null;
  }[];
}

const DAYS_SLO = ["Pon", "Tor", "Sre", "Čet", "Pet", "Sob", "Ned"];
const ROLES = [
  { id: "waiter", label: "Natakar", icon: "🍽️" },
  { id: "cashier", label: "Blagajnik", icon: "🧾" },
  { id: "cook", label: "Kuhar", icon: "👨‍🍳" },
  { id: "manager", label: "Manager", icon: "👔" },
  { id: "host", label: "Hostess", icon: "👋" },
];

// ============================================================
// Glavna komponenta
// ============================================================

export function SchedulingView() {
  const [tab, setTab] = useState<"week" | "clock" | "labor" | "tips" | "live">("week");
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Razpored delavnikov</h2>
        <p className="text-sm text-muted-foreground">
          Planiranje shifts, clock in/out, labor cost analiza, distribucija napitnin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <TabButton active={tab === "week"} onClick={() => setTab("week")}>
          <Clock className="mr-1.5 h-4 w-4" />
          Tedenski razpored
        </TabButton>
        <TabButton active={tab === "clock"} onClick={() => setTab("clock")}>
          <Timer className="mr-1.5 h-4 w-4" />
          Clock In/Out
        </TabButton>
        <TabButton active={tab === "labor"} onClick={() => setTab("labor")}>
          <TrendingUp className="mr-1.5 h-4 w-4" />
          Labor Cost
        </TabButton>
        <TabButton active={tab === "live"} onClick={() => setTab("live")}>
          <Activity className="mr-1.5 h-4 w-4" />
          Live Tracker
        </TabButton>
        <TabButton active={tab === "tips"} onClick={() => setTab("tips")}>
          <Coins className="mr-1.5 h-4 w-4" />
          Tip Pool
        </TabButton>
      </div>

      {tab === "week" && (
        <WeekSchedule weekStart={weekStart} setWeekStart={setWeekStart} />
      )}
      {tab === "clock" && <ClockView />}
      {tab === "labor" && <LaborCostView />}

      {tab === "live" && <LaborCostTracker />}
      {tab === "tips" && <TipPoolView />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================
// Week Schedule View
// ============================================================

function WeekSchedule({
  weekStart,
  setWeekStart,
}: {
  weekStart: string;
  setWeekStart: (s: string) => void;
}) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opsRes, schRes] = await Promise.all([
        fetch("/api/operators"),
        fetch(`/api/schedules?week=${weekStart}`),
      ]);
      const ops = await opsRes.json();
      const sch = await schRes.json();
      setOperators(ops);
      setSchedules(sch);
    } catch {
      toast.error("Napaka pri nalaganju");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      label: DAYS_SLO[i],
      dayNum: d.getDate(),
      isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    };
  });

  const scheduleFor = (opId: string, date: string) =>
    schedules.find((s) => s.operatorId === opId && s.date === date);

  const deleteSchedule = async (id: string) => {
    const pin = prompt("Vnesi admin PIN za brisanje:");
    if (!pin) return;
    const res = await fetch(`/api/schedules/${id}`, {
      method: "DELETE",
      headers: { "x-operator-pin": pin },
    });
    if (res.ok) {
      toast.success("Razpored izbrisan");
      load();
    } else {
      toast.error("Napaka pri brisanju");
    }
  };

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>
          ← Prejšnji teden
        </Button>
        <div className="text-center">
          <p className="font-semibold">
            {new Date(weekStart).toLocaleDateString("sl-SI", {
              day: "numeric",
              month: "long",
            })}{" "}
            —{" "}
            {new Date(weekDays[6].date).toLocaleDateString("sl-SI", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="h-6 text-xs"
          >
            Današnji teden
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>
          Naslednji teden →
        </Button>
      </div>

      {/* Grid: operatorji × dnevi */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 border-b pb-2">
            <div className="px-2 text-xs font-semibold text-muted-foreground">
              Operater
            </div>
            {weekDays.map((d) => (
              <div
                key={d.date}
                className={`rounded px-2 py-1 text-center text-xs ${
                  d.isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <div className="font-semibold">{d.label}</div>
                <div>{d.dayNum}</div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Nalagam...</div>
          ) : operators.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Ni operaterjev. Dodaj operaterje v nastavitvah.
            </div>
          ) : (
            operators.map((op) => (
              <div
                key={op.id}
                className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 border-b py-1"
              >
                <div className="flex items-center px-2">
                  <div>
                    <p className="text-sm font-medium">{op.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEUR(op.hourlyRate)}/h
                    </p>
                  </div>
                </div>
                {weekDays.map((d) => {
                  const sch = scheduleFor(op.id, d.date);
                  return (
                    <div key={d.date} className="min-h-[60px] p-1">
                      {sch ? (
                        <div className="group relative h-full rounded border bg-card p-1.5 text-xs">
                          <div className="font-semibold text-primary">
                            {sch.startTime}–{sch.endTime}
                          </div>
                          <div className="text-muted-foreground">
                            {ROLES.find((r) => r.id === sch.role)?.label || sch.role}
                          </div>
                          <button
                            onClick={() => deleteSchedule(sch.id)}
                            className="absolute right-0 top-0 hidden rounded-bl bg-destructive/10 px-1 text-destructive group-hover:block"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDay(d.date);
                            setSelectedOperator(op.id);
                            setAddOpen(true);
                          }}
                          className="flex h-full min-h-[60px] w-full items-center justify-center rounded border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add schedule dialog */}
      <AddScheduleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        operatorId={selectedOperator}
        date={selectedDay}
        onSaved={load}
      />
    </div>
  );
}

function AddScheduleDialog({
  open,
  onOpenChange,
  operatorId,
  date,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  operatorId: string;
  date: string;
  onSaved: () => void;
}) {
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [role, setRole] = useState("waiter");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStartTime("08:00");
      setEndTime("16:00");
      setRole("waiter");
      setNote("");
      setPin("");
    }
  }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-pin": pin,
        },
        body: JSON.stringify({
          operatorId,
          date,
          startTime,
          endTime,
          role,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success("Razpored shranjen");
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error("Napaka pri shranjevanju");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Dodaj shift — {new Date(date).toLocaleDateString("sl-SI")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Začetek</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Konec</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Vloga</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.icon} {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Opomba (opcijsko)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="npr. testna izmena, trening..."
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Admin PIN</Label>
            <Input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Prekliči
          </Button>
          <Button onClick={save} disabled={saving || pin.length !== 4}>
            {saving ? "Shranjujem..." : "Shrani"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Clock In/Out View
// ============================================================

function ClockView() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [tsRes, opsRes] = await Promise.all([
        fetch(`/api/timesheets?date=${today}`),
        fetch("/api/operators"),
      ]);
      const ts = await tsRes.json();
      const ops = await opsRes.json();
      setTimesheets(ts);
      setOperators(ops);
    } catch {
      toast.error("Napaka pri nalaganju");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const clockAction = async (operatorId: string, action: "in" | "out") => {
    const op = operators.find((o) => o.id === operatorId);
    if (!op) return;
    try {
      const res = await fetch("/api/timesheets/clock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-pin": op.pin,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Napaka");
        return;
      }
      toast.success(
        action === "in"
          ? `${op.name}: clock in ✓`
          : `${op.name}: clock out ✓`
      );
      load();
    } catch {
      toast.error("Napaka");
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const activeCount = timesheets.filter((t) => !t.clockOut).length;

  if (loading) return <div className="py-8 text-center text-muted-foreground">Nalagam...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktivnih</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Timer className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vseh shifts danes</p>
              <p className="text-2xl font-bold">{timesheets.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-950">
              <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Datum</p>
              <p className="text-lg font-bold">
                {new Date(today).toLocaleDateString("sl-SI")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Hitri Clock In/Out (klik na operaterja)
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {operators.map((op) => {
            const active = timesheets.find(
              (t) => t.operatorId === op.id && !t.clockOut
            );
            return (
              <Card key={op.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{op.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLES.find((r) => r.id === op.role)?.label || op.role} ·{" "}
                      {formatEUR(op.hourlyRate)}/h
                    </p>
                    {active && (
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        ⏱️ Od {new Date(active.clockIn).toLocaleTimeString("sl-SI", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={active ? "destructive" : "default"}
                    onClick={() => clockAction(op.id, active ? "out" : "in")}
                  >
                    {active ? (
                      <>
                        <Square className="mr-1 h-3 w-3" /> Out
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 h-3 w-3" /> In
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Dnevni dnevnik */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Dnevnik ur danes
        </h3>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">Operater</th>
                <th className="p-2 text-left font-medium">Prihod</th>
                <th className="p-2 text-left font-medium">Odhod</th>
                <th className="p-2 text-right font-medium">Trajanje</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    Ni zabeleženih ur za danes
                  </td>
                </tr>
              ) : (
                timesheets.map((ts) => {
                  const end = ts.clockOut ? new Date(ts.clockOut) : new Date();
                  const minutes = Math.floor(
                    (end.getTime() - new Date(ts.clockIn).getTime()) / 60000
                  );
                  const hours = Math.floor(minutes / 60);
                  const mins = minutes % 60;
                  return (
                    <tr key={ts.id} className="border-b last:border-0">
                      <td className="p-2">
                        <div className="font-medium">{ts.operator.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatEUR(ts.operator.hourlyRate)}/h
                        </div>
                      </td>
                      <td className="p-2">
                        {new Date(ts.clockIn).toLocaleTimeString("sl-SI", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2">
                        {ts.clockOut ? (
                          new Date(ts.clockOut).toLocaleTimeString("sl-SI", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          <Badge variant="default" className="bg-emerald-600">
                            Aktivna
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {hours}h {mins}m
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Labor Cost View
// ============================================================

function LaborCostView() {
  const [data, setData] = useState<LaborCost | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/labor-cost");
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Napaka");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return <div className="py-8 text-center text-muted-foreground">Nalagam...</div>;
  }

  const laborStatus =
    data.laborCostPercent < 25
      ? { label: "Odlično", color: "text-emerald-600 dark:text-emerald-400" }
      : data.laborCostPercent < 35
      ? { label: "V redu", color: "text-amber-600 dark:text-amber-400" }
      : { label: "Visoko", color: "text-destructive" };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Strošek dela</p>
              <p className="text-2xl font-bold">{formatEUR(data.totalCost)}</p>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Promet</p>
              <p className="text-2xl font-bold">{formatEUR(data.revenue)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Labor cost %</p>
              <p className={`text-2xl font-bold ${laborStatus.color}`}>
                {data.laborCostPercent}%
              </p>
              <p className={`text-xs ${laborStatus.color}`}>{laborStatus.label}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj ur</p>
              <p className="text-2xl font-bold">{data.totalHours}h</p>
              <p className="text-xs text-muted-foreground">
                {data.activeEmployees} aktivnih / {data.totalEmployees} skupaj
              </p>
            </div>
            <Timer className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Per operator breakdown */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Strošek po operaterjih</h3>
        <div className="space-y-2">
          {data.perOperator.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Ni podatkov. Zabeleži ure v Clock In/Out zavihku.
            </p>
          ) : (
            data.perOperator.map((op) => {
              const hours = Math.floor(op.minutes / 60);
              const mins = op.minutes % 60;
              const isWorking = !op.clockOut;
              return (
                <div
                  key={op.operatorId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isWorking ? "bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{op.operatorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEUR(op.hourlyRate)}/h · {hours}h {mins}m
                        {isWorking && " (aktivna)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatEUR(op.cost)}</p>
                    <p className="text-xs text-muted-foreground">strošek</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-4 bg-muted/30">
        <h3 className="mb-2 text-sm font-semibold">💡 Kaj pomeni labor cost %?</h3>
        <p className="text-xs text-muted-foreground">
          Labor cost % = (strošek dela ÷ promet) × 100. V restavracijah je idealno{" "}
          <strong>25–30%</strong>. Čez 35% pomeni previsoke stroške dela — premajhen
          promet ali preveč ur za trenutno obremenitev. Pod 20% pomeni morda
          premalo osebja (slaba storitev).
        </p>
      </Card>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=ned, 1=pon, ...
  const diff = day === 0 ? -6 : 1 - day; // ponedeljek kot začetek
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Tip Pool View — distribucija napitnin
// ============================================================

interface TipDistribution {
  operatorId: string;
  operatorName: string;
  role: string;
  hourlyRate: number;
  minutes: number;
  hours: number;
  weight: number;
  weightedMinutes: number;
  share: number;
  amount: number;
  clockIn: string;
  clockOut: string | null;
}

interface TipPoolData {
  date: string;
  method: "hours" | "role" | "hybrid";
  totalTips: number;
  totalRevenue: number;
  orderCount: number;
  totalHours: number;
  activeEmployees: number;
  totalEmployees: number;
  distributions: TipDistribution[];
  roundingDiff: number;
  roleWeights: Record<string, number>;
  message?: string;
}

const ROLE_LABELS: Record<string, string> = {
  waiter: "Natakar",
  cashier: "Blagajnik",
  cook: "Kuhar",
  host: "Hostess",
  manager: "Manager",
};

function TipPoolView() {
  const [data, setData] = useState<TipPoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"hours" | "role" | "hybrid">("hybrid");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tip-pool?date=${date}&method=${method}`);
      if (!res.ok) throw new Error("Napaka");
      setData(await res.json());
    } catch {
      toast.error("Napaka pri nalaganju tip pool");
    } finally {
      setLoading(false);
    }
  }, [date, method]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return <div className="py-8 text-center text-muted-foreground">Nalagam...</div>;
  }

  const tipPercent = data.totalRevenue > 0
    ? Math.round((data.totalTips / data.totalRevenue) * 1000) / 10
    : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Datum</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Metoda</label>
          <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hibrid (ure × vloga)</SelectItem>
              <SelectItem value="hours">Po urah (enako)</SelectItem>
              <SelectItem value="role">Po vlogi (fiksno)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj napitnine</p>
              <p className="text-2xl font-bold text-amber-600">{formatEUR(data.totalTips)}</p>
            </div>
            <Coins className="h-5 w-5 text-amber-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Promet</p>
              <p className="text-2xl font-bold">{formatEUR(data.totalRevenue)}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">% napitnine</p>
              <p className="text-2xl font-bold">{tipPercent}%</p>
              <p className="text-xs text-muted-foreground">{data.orderCount} računov</p>
            </div>
            <Timer className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Skupaj ur</p>
              <p className="text-2xl font-bold">{data.totalHours}h</p>
              <p className="text-xs text-muted-foreground">
                {data.activeEmployees} aktivnih / {data.totalEmployees}
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {data.message ? (
        <Card className="p-6 text-center text-muted-foreground">
          {data.message}
        </Card>
      ) : (
        <>
          {/* Distributions table */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 p-3">
              <h3 className="text-sm font-semibold">
                Distribucija napitnin — {data.distributions.length} zaposlenih
              </h3>
              <p className="text-xs text-muted-foreground">
                Metoda: {data.method === "hours" ? "po urah" : data.method === "role" ? "po vlogi" : "hibrid (ure × vloga)"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left font-medium">Zaposleni</th>
                    <th className="p-3 text-left font-medium">Vloga</th>
                    <th className="p-3 text-right font-medium">Ure</th>
                    <th className="p-3 text-right font-medium">Weight</th>
                    <th className="p-3 text-right font-medium">Delež</th>
                    <th className="p-3 text-right font-medium">Znesek</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distributions.map((d) => (
                    <tr key={d.operatorId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{d.operatorName}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.clockIn && new Date(d.clockIn).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {d.clockOut ? new Date(d.clockOut).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" }) : "aktivna"}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {ROLE_LABELS[d.role] || d.role}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono">{d.hours}h</td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                        {d.weight}×
                      </td>
                      <td className="p-3 text-right font-mono">{d.share}%</td>
                      <td className="p-3 text-right font-bold text-amber-600">
                        {formatEUR(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 bg-muted/50">
                  <tr>
                    <td colSpan={5} className="p-3 text-right font-semibold">Skupaj:</td>
                    <td className="p-3 text-right font-bold text-amber-600">
                      {formatEUR(data.totalTips)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {Math.abs(data.roundingDiff) >= 0.01 && (
              <div className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                ⚠️ Razlika zaradi zaokroževanja: {formatEUR(data.roundingDiff)} (ročno poračunaj)
              </div>
            )}
          </Card>

          {/* Info card */}
          <Card className="p-4 bg-muted/30">
            <h3 className="mb-2 text-sm font-semibold">💡 Kako deluje distribucija?</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Hibrid (priporočeno):</strong> ure × weight per vloga. Natakar (1.0×), blagajnik (0.8×), kuhar (0.6×), host (0.5×), manager (0.3×).</p>
              <p><strong>Po urah:</strong> vsak dobi proporcionalno delu — ne glede na vlogo.</p>
              <p><strong>Po vlogi:</strong> fiksni deleži ne glede na ure (primer: kuharji ki delajo manj).</p>
            </div>
          </Card>
        </>
      )}

      {/* Dodatna analitika: Tip Distribution */}
      <TipDistribution />
    </div>
  );
}
