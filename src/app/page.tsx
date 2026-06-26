"use client";

import { useEffect, useState } from "react";
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
import { ZReportView } from "@/components/pos/z-report-view";
import { SettingsView } from "@/components/pos/settings-view";
import { OperatorsAdminView } from "@/components/pos/operators-admin-view";
import { TablesAdminView } from "@/components/pos/tables-admin-view";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { PinLoginDialog, getStoredOperator, type Operator } from "@/components/pos/pin-login";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, UserCircle } from "lucide-react";

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
            {activeView === "zreport" && <ZReportView />}
            {activeView === "settings" && <SettingsView />}
            {activeView === "operators" && <OperatorsAdminView />}
            {activeView === "tables-admin" && <TablesAdminView />}
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
