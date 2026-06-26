"use client";

import { usePosStore } from "@/stores/pos-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PosHeader } from "@/components/pos/pos-header";
import { PosSidebar, PosFooter } from "@/components/pos/pos-footer";
import { TablesView } from "@/components/pos/tables-view";
import { OrderView } from "@/components/pos/order-view";
import { ReceiptsView } from "@/components/pos/receipts-view";
import { MenuAdminView } from "@/components/pos/menu-admin-view";
import { DashboardView } from "@/components/pos/dashboard-view";
import { ZReportView } from "@/components/pos/z-report-view";
import { SettingsView } from "@/components/pos/settings-view";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { Toaster } from "sonner";

export default function Home() {
  const activeView = usePosStore((s) => s.activeView);
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PosHeader />

      <div className="flex flex-1 overflow-hidden">
        <PosSidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-7xl">
            {activeView === "tables" && <TablesView />}
            {activeView === "order" && <OrderView />}
            {activeView === "receipts" && <ReceiptsView />}
            {activeView === "menu" && <MenuAdminView />}
            {activeView === "dashboard" && <DashboardView />}
            {activeView === "zreport" && <ZReportView />}
            {activeView === "settings" && <SettingsView />}
          </div>
        </main>
      </div>

      <PosFooter />
      <PaymentDialog />
      <Toaster richColors position="top-center" />
    </div>
  );
}
