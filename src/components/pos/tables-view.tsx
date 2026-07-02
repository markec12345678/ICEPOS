"use client";

import { useState, useEffect } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { usePosStore } from "@/stores/pos-store";
import { formatEUR, formatTime, type Table, type Order, type DashboardStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useNow, formatElapsed, getUrgencyLevel } from "@/hooks/use-now";
import { OrderFlagsDisplay } from "@/components/pos/order-flags";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Users, Receipt, AlertCircle, LayoutGrid, CalendarDays, Search, QrCode, Plus, Timer } from "lucide-react";
import { toast } from "sonner";

interface Reservation {
  id: string;
  customerName: string;
  partySize: number;
  time: string;
  status: string;
  note: string | null;
}

type TableWithOrders = Table & {
  orders: (Order & { items: { id: string }[] })[];
  reservations: Reservation[];
};

export function TablesView() {
  const { data, loading, error, refetch } = useFetch<TableWithOrders[]>("/api/tables");
  const { data: stats } = useFetch<DashboardStats>("/api/stats");
  const selectTable = usePosStore((s) => s.selectTable);
  const [section, setSection] = useState<string>("Vse");
  const [search, setSearch] = useState("");
  const [prevOpenCount, setPrevOpenCount] = useState<number>(0);
  const now = useNow(1000); // vsako sekundo za timer

  // Auto-refresh vsakih 10s — zazna nova online naročila gostov
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Obvesti ko se pojavi novo naročilo (count open orders increased)
  useEffect(() => {
    if (!data) return;
    const openCount = data.filter((t) =>
      t.orders.some((o) => o.status === "open")
    ).length;
    if (prevOpenCount > 0 && openCount > prevOpenCount) {
      toast.info("🔔 Novo naročilo!", {
        description: "Gost je oddal novo naročilo preko QR kode",
      });
    }
    setPrevOpenCount(openCount);
  }, [data, prevOpenCount]);

  async function handleSeatReservation(reservationId: string, tableName: string) {
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "seated" }),
      });
      if (!res.ok) throw new Error("Napaka");
      toast.success(`Rezervacija potrjena — miza ${tableName} je sedela`);
      refetch();
    } catch {
      toast.error("Napaka pri potrjevanju rezervacije");
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Napaka pri nalaganju miz: {error}
        </p>
        <button
          onClick={refetch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Poskusi znova
        </button>
      </div>
    );
  }

  const tables = data || [];
  const sections = ["Vse", ...Array.from(new Set(tables.map((t) => t.section)))];

  // Filter po sekciji
  let filteredTables = section === "Vse" ? tables : tables.filter((t) => t.section === section);

  // Filter po iskanju (številka ali ime)
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredTables = filteredTables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.number).includes(q)
    );
  }

  // Razdeli po sekcijah za vizualni tloris (ko je "Vse")
  const tablesBySection: Record<string, TableWithOrders[]> = {};
  if (section === "Vse") {
    for (const t of filteredTables) {
      if (!tablesBySection[t.section]) tablesBySection[t.section] = [];
      tablesBySection[t.section].push(t);
    }
  } else {
    tablesBySection[section] = filteredTables;
  }

  const openCount = tables.filter((t) =>
    t.orders.some((o) => o.status === "open")
  ).length;
  const reservationsToday = tables.reduce(
    (s, t) => s + (t.reservations?.length || 0),
    0
  );

  // Povprečni čas odprtih miz + skupno postavk
  const openOrders = tables.flatMap((t) =>
    t.orders.filter((o) => o.status === "open")
  );
  const totalOpenItems = openOrders.reduce((s, o) => s + (o.items?.length || 0), 0);
  const avgTableMinutes = openOrders.length > 0
    ? Math.round(
        openOrders.reduce((s, o) => {
          const diff = now.getTime() - new Date(o.createdAt).getTime();
          return s + diff / 60000;
        }, 0) / openOrders.length
      )
    : 0;
  const longTables = openOrders.filter((o) => {
    const diff = now.getTime() - new Date(o.createdAt).getTime();
    return diff / 60000 >= 90;
  }).length;

  // Ikone za sekcije
  const sectionIcons: Record<string, string> = {
    Dvorana: "🏛️",
    Terasa: "🌿",
    Zasebna: "🔒",
    Bar: "🍸",
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Stat strip — prva vrstica */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard label="Skupaj miz" value={String(tables.length)} accent="neutral" />
        <StatCard label="Zasedene" value={String(openCount)} accent="amber" />
        <StatCard label="Proste" value={String(tables.length - openCount)} accent="emerald" />
        <StatCard label="Rezervacije danes" value={String(reservationsToday)} accent="amber" />
        {stats && (
          <StatCard
            label="Prihodek danes"
            value={formatEUR(stats.todayRevenue)}
            accent="emerald"
          />
        )}
      </div>

      {/* Stat strip — druga vrstica: real-time mize metrike */}
      {openCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="⏱️ Povprečni čas mize"
            value={avgTableMinutes >= 60 ? `${Math.floor(avgTableMinutes / 60)}h ${avgTableMinutes % 60}m` : `${avgTableMinutes}m`}
            accent={avgTableMinutes >= 90 ? "rose" : avgTableMinutes >= 45 ? "amber" : "emerald"}
          />
          <StatCard
            label="🍽️ Postavk v teku"
            value={String(totalOpenItems)}
            accent="amber"
          />
          <StatCard
            label="⚠️ Dolge mize (>90m)"
            value={String(longTables)}
            accent={longTables > 0 ? "rose" : "emerald"}
          />
          <StatCard
            label="📊 Zasedenost"
            value={`${tables.length > 0 ? Math.round((openCount / tables.length) * 100) : 0}%`}
            accent={openCount / Math.max(tables.length, 1) > 0.7 ? "rose" : "neutral"}
          />
        </div>
      )}

      {/* Section filter + iskalnik + hitri nov račun */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all hover:-translate-y-0.5",
                section === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {s !== "Vse" && sectionIcons[s] ? `${sectionIcons[s]} ` : ""}
              {s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Išči mizo po imenu ali številki..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            const freeTable = tables.find(
              (t) => !t.orders.some((o) => o.status === "open")
            );
            if (freeTable) {
              selectTable(freeTable.id);
              toast.success(`Miza ${freeTable.name} odprta`);
            } else {
              toast.error("Ni prostih miz");
            }
          }}
          className="bg-amber-600 hover:bg-amber-700"
          size="sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Nov račun
        </Button>
      </div>

      {/* Vizualni tloris po sekcijah */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LayoutGrid className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {search.trim() ? "Ni najdenih miz" : "V tej sekciji ni miz"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {search.trim()
                ? `Za "${search}" ni rezultatov.`
                : "Izberite drugo sekcijo zgoraj ali preverite tloris lokala."}
            </p>
          </div>
          {(section !== "Vse" || search.trim()) && (
            <button
              onClick={() => {
                setSection("Vse");
                setSearch("");
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Prikaži vse mize
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(tablesBySection).map(([sec, secTables]) => (
            <div key={sec} className="space-y-3">
              {/* Naslov sekcije */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="text-lg">{sectionIcons[sec] || "📍"}</span>
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  {sec}
                </h3>
                <Badge variant="secondary" className="ml-1">
                  {secTables.length}
                </Badge>
              </div>

              {/* Mize v sekciji */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {secTables.map((t) => {
                  const openOrder = t.orders.find((o) => o.status === "open");
                  const occupied = !!openOrder;
                  const itemsCount = openOrder?.items.length || 0;
                  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(
                    now.getMinutes()
                  ).padStart(2, "0")}`;
                  const nextReservation = (t.reservations || [])
                    .filter((r) => r.time >= nowStr)
                    .sort((a, b) => a.time.localeCompare(b.time))[0];
                  const hasReservationSoon = !!nextReservation;
                  const urgency = openOrder ? getUrgencyLevel(openOrder.createdAt, now) : "normal";
                  const elapsed = openOrder ? formatElapsed(openOrder.createdAt, now) : "";
                  return (
                    <Card
                      key={t.id}
                      onClick={() => selectTable(t.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectTable(t.id);
                        }
                      }}
                      className={cn(
                        "group relative cursor-pointer overflow-hidden p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]",
                        occupied
                          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30"
                          : hasReservationSoon
                          ? "border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 dark:border-sky-800 dark:from-sky-950/30 dark:to-blue-950/20"
                          : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-green-950/20"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            #{t.number}
                          </p>
                          <h3 className="mt-0.5 text-lg font-bold text-foreground">
                            {t.name}
                          </h3>
                        </div>
                        <span
                          className={cn(
                            "flex h-2.5 w-2.5 rounded-full",
                            occupied
                              ? "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.2)]"
                              : hasReservationSoon
                              ? "bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.2)]"
                              : "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                          )}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{t.seats} oseb</span>
                      </div>

                      {occupied ? (
                        <div className="mt-3 space-y-1.5">
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                          >
                            <Receipt className="h-3 w-3" />
                            {itemsCount} postavk
                          </Badge>
                          {openOrder && (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                                  urgency === "urgent" && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
                                  urgency === "warning" && "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
                                  urgency === "normal" && "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                )}
                                title={`Odprt od ${formatTime(openOrder.createdAt)}`}
                              >
                                {urgency === "urgent" ? <AlertCircle className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
                                {elapsed}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                od {formatTime(openOrder.createdAt)}
                              </span>
                            </div>
                          )}
                          {openOrder?.flags && <OrderFlagsDisplay flags={openOrder.flags} />}
                        </div>
                      ) : hasReservationSoon ? (
                        <div className="mt-3 space-y-1">
                          <Badge
                            variant="outline"
                            className="gap-1 border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                          >
                            <CalendarDays className="h-3 w-3" />
                            {nextReservation.time}
                          </Badge>
                          <p className="truncate text-xs text-muted-foreground">
                            {nextReservation.customerName} ({nextReservation.partySize})
                          </p>
                          {nextReservation.note && (
                            <p className="truncate text-[10px] italic text-amber-700 dark:text-amber-400">
                              📝 {nextReservation.note}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeatReservation(nextReservation.id, t.name);
                            }}
                            className="mt-1 w-full rounded-md border border-sky-300 bg-sky-100 px-2 py-1 text-[10px] font-semibold text-sky-800 transition-colors hover:bg-sky-200 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/50"
                          >
                            ✓ Sedi (potrdi rezervacijo)
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Prosta
                        </p>
                      )}
                      {/* QR meni link za goste */}
                      <a
                        href={`/meni?miza=${t.number}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 flex items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-900/30"
                        title="Javni meni za to mizo (QR)"
                      >
                        <QrCode className="h-3 w-3" />
                        Meni za gosta
                      </a>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Kliknite mizo za odprtje naročilo ·{" "}
        <a
          href="/meni"
          target="_blank"
          className="text-amber-600 underline hover:text-amber-700 dark:text-amber-400"
        >
          Javni meni za goste
        </a>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "neutral" | "amber" | "emerald" | "rose";
}) {
  return (
    <Card
      className={cn(
        "p-3 transition-shadow hover:shadow-sm",
        accent === "amber" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
        accent === "emerald" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
        accent === "rose" && "border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          accent === "amber" && "text-amber-700 dark:text-amber-400",
          accent === "emerald" && "text-emerald-700 dark:text-emerald-400",
          accent === "rose" && "text-rose-700 dark:text-rose-400",
          accent === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
    </Card>
  );
}
