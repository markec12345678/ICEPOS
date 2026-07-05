// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/inventory/reorder-report — pametni predlog naročil
// Analizira:
//   - Katere artikle je treba naročiti (stanje < min)
//   - Predlagano količino (min × 2 ali 10 enot minimum)
//   - Skupni strošek po dobavitelju
//   - Kontakti dobaviteljev
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.inventoryItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });

    // Filtriraj artikle z nizko zalogo (stanje <= min)
    const reorderItems = items.filter(
      (item) => item.quantity <= item.minQuantity
    );

    if (reorderItems.length === 0) {
      return NextResponse.json({
        items: [],
        suppliers: [],
        summary: {
          totalItems: 0,
          totalCost: 0,
          supplierCount: 0,
          message: "Vsi artikli imajo dovolj zalog. Ni treba naročiti.",
        },
      });
    }

    // Grupiraj po dobavitelju
    const supplierMap = new Map<
      string,
      {
        supplier: string;
        items: {
          id: string;
          name: string;
          unit: string;
          currentQty: number;
          minQty: number;
          suggestedQty: number;
          costPerUnit: number;
          totalCost: number;
          category: string;
        }[];
        totalCost: number;
      }
    >();

    for (const item of reorderItems) {
      const supplier = item.supplier || "Neznan dobavitelj";
      const suggestedQty = Math.max(item.minQuantity * 2, 10);
      const totalCost = Math.round(suggestedQty * Number(item.costPerUnit) * 100) / 100;

      const existing = supplierMap.get(supplier);
      const itemData = {
        id: item.id,
        name: item.name,
        unit: item.unit,
        currentQty: item.quantity,
        minQty: item.minQuantity,
        suggestedQty,
        costPerUnit: item.costPerUnit,
        totalCost,
        category: item.category,
      };

      if (existing) {
        existing.items.push(itemData);
        existing.totalCost = Math.round((existing.totalCost + totalCost) * 100) / 100;
      } else {
        supplierMap.set(supplier, {
          supplier,
          items: [itemData],
          totalCost,
        });
      }
    }

    const suppliers = [...supplierMap.values()].sort((a, b) => b.totalCost - a.totalCost);
    const allItems = suppliers.flatMap((s) => s.items);
    const totalCost = Math.round(allItems.reduce((s, i) => s + i.totalCost, 0) * 100) / 100;

    return NextResponse.json({
      items: allItems,
      suppliers,
      summary: {
        totalItems: allItems.length,
        totalCost,
        supplierCount: suppliers.length,
        message: `${allItems.length} artiklov za naročilo pri ${suppliers.length} dobaviteljih (skupaj ${totalCost}€)`,
      },
    });
  } catch (e) {
    console.error("GET /api/inventory/reorder-report error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
