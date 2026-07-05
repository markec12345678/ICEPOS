"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/stores/pos-store";
import { useTenantStore } from "@/stores/tenant-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { playFeedbackSound } from "@/hooks/use-sound-feedback";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { PosHeader } from "@/components/pos/pos-header";
import { PosSidebar, PosFooter } from "@/components/pos/pos-footer";
import { TablesView } from "@/components/pos/tables-view";
import { OrderView } from "@/components/pos/order-view";
import { ReceiptsView } from "@/components/pos/receipts-view";
import { KitchenDisplayView } from "@/components/pos/kitchen-display-view";
import { ShiftView } from "@/components/pos/shift-view";
import { DashboardView } from "@/components/pos/dashboard-view";
import { OutOfStockBanner } from "@/components/pos/out-of-stock-banner";
import { OfflineResilienceBanner } from "@/components/pos/offline-resilience-banner";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { GlobalSearch } from "@/components/global-search";
import { PinLoginDialog, getStoredOperator, type Operator } from "@/components/pos/pin-login";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, UserCircle, Bell } from "lucide-react";

import dynamic from "next/dynamic";
const MenuAdminView = dynamic(() => import("@/components/pos/menu-admin-view").then(m => { return { default: m.MenuAdminView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const ReservationsView = dynamic(() => import("@/components/pos/reservations-view").then(m => { return { default: m.ReservationsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const MonthlyReportView = dynamic(() => import("@/components/pos/monthly-report-view").then(m => { return { default: m.MonthlyReportView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const WeeklyStatsView = dynamic(() => import("@/components/pos/weekly-stats-view").then(m => { return { default: m.WeeklyStatsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const ZReportView = dynamic(() => import("@/components/pos/z-report-view").then(m => { return { default: m.ZReportView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const SettingsView = dynamic(() => import("@/components/pos/settings-view").then(m => { return { default: m.SettingsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const OperatorsAdminView = dynamic(() => import("@/components/pos/operators-admin-view").then(m => { return { default: m.OperatorsAdminView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const TablesAdminView = dynamic(() => import("@/components/pos/tables-admin-view").then(m => { return { default: m.TablesAdminView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const InventoryView = dynamic(() => import("@/components/pos/inventory-view").then(m => { return { default: m.InventoryView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const CustomerView = dynamic(() => import("@/components/pos/customer-view").then(m => { return { default: m.CustomerView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const GiftCardsView = dynamic(() => import("@/components/pos/gift-cards-view").then(m => { return { default: m.GiftCardsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const SchedulingView = dynamic(() => import("@/components/pos/scheduling-view").then(m => { return { default: m.SchedulingView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const MenuEngineeringView = dynamic(() => import("@/components/pos/menu-engineering-view").then(m => { return { default: m.MenuEngineeringView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const BenchmarkView = dynamic(() => import("@/components/pos/benchmark-view").then(m => { return { default: m.BenchmarkView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const WasteView = dynamic(() => import("@/components/pos/waste-view").then(m => { return { default: m.WasteView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const HappyHourView = dynamic(() => import("@/components/pos/happy-hour-view").then(m => { return { default: m.HappyHourView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const WoltView = dynamic(() => import("@/components/pos/wolt-view").then(m => { return { default: m.WoltView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const ForecastView = dynamic(() => import("@/components/pos/forecast-view").then(m => { return { default: m.ForecastView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const ComboMealsView = dynamic(() => import("@/components/pos/combo-meals-view").then(m => { return { default: m.ComboMealsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const AccountingView = dynamic(() => import("@/components/pos/accounting-view").then(m => { return { default: m.AccountingView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const DeliverectView = dynamic(() => import("@/components/pos/deliverect-view").then(m => { return { default: m.DeliverectView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const OpenTableView = dynamic(() => import("@/components/pos/opentable-view").then(m => { return { default: m.OpenTableView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const ImagesView = dynamic(() => import("@/components/pos/images-view").then(m => { return { default: m.ImagesView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const EmployeePerformanceView = dynamic(() => import("@/components/pos/employee-performance-view").then(m => { return { default: m.EmployeePerformanceView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const CustomerAnalyticsView = dynamic(() => import("@/components/pos/customer-analytics-view").then(m => { return { default: m.CustomerAnalyticsView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const FeedbackView = dynamic(() => import("@/components/pos/feedback-view").then(m => { return { default: m.FeedbackView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const WaitlistView = dynamic(() => import("@/components/pos/waitlist-view").then(m => { return { default: m.WaitlistView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});

const AuditLogView = dynamic(() => import("@/components/pos/audit-log-view").then(m => { return { default: m.AuditLogView }; }), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" /></div>,
  ssr: false,
});


export default function Home() {
  const activeView = usePosStore((s) => s.activeView);
  useKeyboardShortcuts();
  const loadTenantList = useTenantStore((s) => s.loadList);

  // Operator login state
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Naloži tenant listo ob mount-u
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    loadTenantList();
    const stored = getStoredOperator();
    if (stored) {
      setOperator(stored);
    }
  }, [loadTenantList]);

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
  // Robustna povezava z exponential backoff + auto-recovery
  useRealtimeSync({
    port: 3003,
    notifyRecovery: false, // Ne prikazuj recovery toast na main page (samo v KDS)
    handlers: {
      "order:recall": (data: unknown) => {
        const recallData = data as { tableName: string; item?: string };
        // Glasni toast z zvokom (če je dovoljen)
        toast.success(`🔔 Klic iz kuhinje: ${recallData.tableName}`, {
          description: recallData.item || "Jedi so pripravljene za prevzem",
          duration: 8000,
        });

        // Predvajaj kitchen zvok (upošteva sound enabled flag)
        playFeedbackSound("kitchen");
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Skip link za tipkovnične uporabnike */}
      <a href="#main-content" className="skip-link">
        Preskoči na vsebino
      </a>

      {/* ARIA live region za screen reader obvestila */}
      <div aria-live="polite" aria-atomic="true" id="aria-live-region" />

      <PosHeader />

      {/* Offline resilience banner — connection quality + fiscal queue */}
      <OfflineResilienceBanner />

      {/* Out-of-stock alert banner */}
      <OutOfStockBanner />

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

        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
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
            {activeView === "scheduling" && <SchedulingView />}
            {activeView === "menu-engineering" && <MenuEngineeringView />}
            {activeView === "benchmark" && <BenchmarkView />}
            {activeView === "waste" && <WasteView />}
            {activeView === "happy-hour" && <HappyHourView />}
            {activeView === "wolt" && <WoltView />}
            {activeView === "forecast" && <ForecastView />}
            {activeView === "combos" && <ComboMealsView />}
            {activeView === "accounting" && <AccountingView />}
            {activeView === "deliverect" && <DeliverectView />}
            {activeView === "opentable" && <OpenTableView />}
            {activeView === "images" && <ImagesView />}
            {activeView === "performance" && <EmployeePerformanceView />}
            {activeView === "customer-analytics" && <CustomerAnalyticsView />}
            {activeView === "feedback" && <FeedbackView />}
            {activeView === "waitlist" && <WaitlistView />}
          </div>
        </main>
      </div>

      <PosFooter />
      <PaymentDialog />
      <KeyboardShortcutsHelp />
      <GlobalSearch />
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
