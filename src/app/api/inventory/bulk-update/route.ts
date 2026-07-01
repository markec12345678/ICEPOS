import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/inventory/bulk-update — posodobi več artiklov naenkrat
// Body: { updates: [{ id, quantity?, minQuantity?, costPerUnit?, supplier? }] }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();
    const { updates } = body as {
      updates: {
        id: string;
        quantity?: number;
        minQuantity?: number;
        costPerUnit?: number;
        supplier?: string;
      }[];
    };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (updates array)" },
        { status: 400 }
      );
    }

    let updated = 0;
    let failed = 0;

    for (const update of updates) {
      if (!update.id) {
        failed++;
        continue;
      }

      // Preveri da artikel pripada temu tenant-u
      const existing = await db.inventoryItem.findFirst({
        where: { id: update.id, restaurantId: tenant.id },
      });

      if (!existing) {
        failed++;
        continue;
      }

      const data: Record<string, unknown> = {};
      if (typeof update.quantity === "number") data.quantity = update.quantity;
      if (typeof update.minQuantity === "number") data.minQuantity = update.minQuantity;
      if (typeof update.costPerUnit === "number") data.costPerUnit = update.costPerUnit;
      if (typeof update.supplier === "string") data.supplier = update.supplier;

      if (Object.keys(data).length === 0) {
        failed++;
        continue;
      }

      await db.inventoryItem.update({
        where: { id: update.id },
        data,
      });
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      failed,
      total: updates.length,
      message: `Posodobljenih ${updated} artiklov${failed > 0 ? `, ${failed} preskočenih` : ""}`,
    });
  } catch (e) {
    console.error("POST /api/inventory/bulk-update error:", e);
    return NextResponse.json({ error: "Napaka pri bulk posodobitvi" }, { status: 500 });
  }
}
