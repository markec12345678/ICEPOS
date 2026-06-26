"use client";

import { usePosStore } from "@/stores/pos-store";
import { PosHeader } from "@/components/pos/pos-header";
import { PosSidebar, PosFooter } from "@/components/pos/pos-footer";
import { TablesView } from "@/components/pos/tables-view";
import { OrderView } from "@/components/pos/order-view";
import { DashboardView } from "@/components/pos/dashboard-view";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { Toaster } from "sonner";

export default function Home() {
  const activeView = usePosStore((s) => s.activeView);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PosHeader />

      <div className="flex flex-1 overflow-hidden">
        <PosSidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            {activeView === "tables" && <TablesView />}
            {activeView === "order" && <OrderView />}
            {activeView === "dashboard" && <DashboardView />}
          </div>
        </main>
      </div>

      <PosFooter />
      <PaymentDialog />
      <Toaster richColors position="top-center" />
    </div>
  );
}
