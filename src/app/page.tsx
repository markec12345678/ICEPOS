"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { usePosStore } from "@/stores/pos-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PosHeader } from "@/components/pos/pos-header";
import { PosSidebar, PosFooter } from "@/components/pos/pos-footer";
import { TablesView } from "@/components/pos/tables-view";
import { OrderView } from "@/components/pos/order-view";
import { ReceiptsView } from "@/components/pos/receipts-view";
import { KitchenDisplayView } from "@/components/pos/kitchen-display-view";
import { MenuAdminView } from "@/components/pos/menu-admin-view";
import { ReservationsView } from "@/components/pos/reservations-view";
import { ShiftView } from "@/components/pos/shift-view";
import { DashboardView } from "@/components/pos/dashboard-view";
import { MonthlyReportView } from "@/components/pos/monthly-report-view";
import { WeeklyStatsView } from "@/components/pos/weekly-stats-view";
import { ZReportView } from "@/components/pos/z-report-view";
import { SettingsView } from "@/components/pos/settings-view";
import { OperatorsAdminView } from "@/components/pos/operators-admin-view";
import { TablesAdminView } from "@/components/pos/tables-admin-view";
import { InventoryView } from "@/components/pos/inventory-view";
import { CustomerView } from "@/components/pos/customer-view";
import { GiftCardsView } from "@/components/pos/gift-cards-view";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { PinLoginDialog, getStoredOperator, type Operator } from "@/components/pos/pin-login";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, UserCircle, Bell } from "lucide-react";

export default function Home() {
  const activeView = usePosStore((s) => s.activeView);
  useKeyboardShortcuts();

  // Operator login state
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Preveri localStorage ob mount-u
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = getStoredOperator();
    if (stored) {
      setOperator(stored);
    }
  }, []);

  // Poslušaj spremembe operatorja (logout iz headerja)
  useEffect(() => {
    function handler() {
      const stored = getStoredOperator();
      setOperator(stored);
      if (!stored) {
        setLoginOpen(true);
      }
    }
    window.addEventListener("operator-changed", handler);
    return () => window.removeEventListener("operator-changed", handler);
  }, []);

  // Globalni WebSocket listener za kuhinjske recall-e (deluje na vseh pogledih)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDev = window.location.port === "3000";
    const socketUrl = isDev
      ? `${window.location.protocol}//${window.location.hostname}:81`
      : "";

    const s = io(`${socketUrl}/?XTransformPort=3003`, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    s.on("order:recall", (data: { tableName: string; item?: string }) => {
      // Glasni toast z zvokom (če je dovoljen)
      toast.success(`🔔 Klic iz kuhinje: ${data.tableName}`, {
        description: data.item || "Jedi so pripravljene za prevzem",
        duration: 8000,
      });

      // Poskusi predvajati zvok (če browser dovoli)
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch {
        // zvok ni kritičen
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PosHeader />

      {/* Alert bar: če ni prijavljenega operatorja */}
      <div data-debug-operator={operator ? "yes" : "no"}>
        {!operator && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <Lock className="mr-1.5 inline h-4 w-4" />
              Za izdajo računov se mora prijaviti blagajnik (FURS zahteva sledljivost operaterjev).
            </p>
            <Button
              size="sm"
              onClick={() => setLoginOpen(true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <UserCircle className="mr-1.5 h-4 w-4" />
              Prijava s PIN
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <PosSidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-7xl">
            {activeView === "tables" && <TablesView />}
            {activeView === "order" && <OrderView />}
            {activeView === "receipts" && <ReceiptsView />}
            {activeView === "kitchen" && <KitchenDisplayView />}
            {activeView === "menu" && <MenuAdminView />}
            {activeView === "reservations" && <ReservationsView />}
            {activeView === "shift" && <ShiftView />}
            {activeView === "dashboard" && <DashboardView />}
            {activeView === "monthly" && <MonthlyReportView />}
            {activeView === "weekly" && <WeeklyStatsView />}
            {activeView === "zreport" && <ZReportView />}
            {activeView === "settings" && <SettingsView />}
            {activeView === "operators" && <OperatorsAdminView />}
            {activeView === "tables-admin" && <TablesAdminView />}
            {activeView === "inventory" && <InventoryView />}
            {activeView === "customers" && <CustomerView />}
            {activeView === "gift-cards" && <GiftCardsView />}
          </div>
        </main>
      </div>

      <PosFooter />
      <PaymentDialog />
      <PinLoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onLogin={(op) => {
          setOperator(op);
          window.dispatchEvent(new Event("operator-changed"));
        }}
      />
      <Toaster richColors position="top-center" />
    </div>
  );
}
