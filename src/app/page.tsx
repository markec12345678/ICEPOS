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
import { SchedulingView } from "@/components/pos/scheduling-view";
import { MenuEngineeringView } from "@/components/pos/menu-engineering-view";
import { BenchmarkView } from "@/components/pos/benchmark-view";
import { WasteView } from "@/components/pos/waste-view";
import { HappyHourView } from "@/components/pos/happy-hour-view";
import { WoltView } from "@/components/pos/wolt-view";
import { ForecastView } from "@/components/pos/forecast-view";
import { ComboMealsView } from "@/components/pos/combo-meals-view";
import { AccountingView } from "@/components/pos/accounting-view";
import { DeliverectView } from "@/components/pos/deliverect-view";
import { OpenTableView } from "@/components/pos/opentable-view";
import { ImagesView } from "@/components/pos/images-view";
import { EmployeePerformanceView } from "@/components/pos/employee-performance-view";
import { CustomerAnalyticsView } from "@/components/pos/customer-analytics-view";
import { FeedbackView } from "@/components/pos/feedback-view";
import { WaitlistView } from "@/components/pos/waitlist-view";
import { SupplierView } from "@/components/pos/supplier-view";
import { CashDrawerView } from "@/components/pos/cash-drawer-view";
import { PurchaseOrderView } from "@/components/pos/purchase-order-view";
import { CostAnalysisView } from "@/components/pos/cost-analysis-view";
import { AllergenMatrixView } from "@/components/pos/allergen-matrix-view";
import { DailySpecialsView } from "@/components/pos/daily-specials-view";
import { OutOfStockBanner } from "@/components/pos/out-of-stock-banner";
import { OfflineResilienceBanner } from "@/components/pos/offline-resilience-banner";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { GlobalSearch } from "@/components/global-search";
import { PinLoginDialog, getStoredOperator, type Operator } from "@/components/pos/pin-login";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, UserCircle, Bell } from "lucide-react";

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
            {activeView === "suppliers" && <SupplierView />}
            {activeView === "cash-drawer" && <CashDrawerView />}
            {activeView === "purchase-orders" && <PurchaseOrderView />}
            {activeView === "cost-analysis" && <CostAnalysisView />}
            {activeView === "allergen-matrix" && <AllergenMatrixView />}
            {activeView === "daily-specials" && <DailySpecialsView />}
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
