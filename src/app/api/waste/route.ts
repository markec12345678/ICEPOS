import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/waste?days=30 — vrne dnevnik odpadkov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const wasteLogs = await db.wasteLog.findMany({
      where: {
        restaurantId: tenant.id,
        createdAt: { gte: since },
      },
      include: { inventoryItem: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json(wasteLogs);
  } catch (e) {
    console.error("GET /api/waste error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/waste — zabeleži nov odpadek
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const operator = await getOperatorFromRequest(req);
    if (!operator) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();
    const {
      inventoryItemId,
      menuItemId,
      name,
      quantity,
      unit,
      cost,
      reason,
      note,
      deductFromInventory,
    } = body as {
      inventoryItemId?: string;
      menuItemId?: string;
      name: string;
      quantity: number;
      unit: string;
      cost?: number;
      reason: string;
      note?: string;
      deductFromInventory?: boolean;
    };

    if (!name || !quantity || !reason) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, quantity, reason)" },
        { status: 400 }
      );
    }

    // Če je inventoryItemId in ni podan cost, izračunaj iz inventory
    let finalCost = cost || 0;
    let finalUnit = unit;
    if (inventoryItemId && !cost) {
      const item = await db.inventoryItem.findFirst({
        where: { id: inventoryItemId, restaurantId: tenant.id },
      });
      if (item) {
        finalCost = Number(item.costPerUnit) * quantity;
        finalUnit = unit || item.unit;
      }
    }

    // Zabeleži odpadek
    const wasteLog = await db.wasteLog.create({
      data: {
        restaurantId: tenant.id,
        inventoryItemId: inventoryItemId || null,
        menuItemId: menuItemId || null,
        name,
        quantity,
        unit: finalUnit || "kos",
        cost: Math.round(finalCost * 100) / 100,
        reason,
        note: note || null,
        operator: operator.name,
      },
    });

    // Opciono: odštej iz inventory-ja
    if (deductFromInventory && inventoryItemId) {
      try {
        await db.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { quantity: { decrement: quantity } },
        });
      } catch (invErr) {
        console.error("[waste] Inventory deduction failed:", invErr);
      }
    }

    return NextResponse.json(wasteLog, { status: 201 });
  } catch (e) {
    console.error("POST /api/waste error:", e);
    return NextResponse.json({ error: "Napaka pri zapisu odpadka" }, { status: 500 });
  }
}
