import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/purchase-orders — vrne vse nabavne naloge za restavracijo
// Podpira opcijski filter ?status=draft|sent|received|cancelled
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const status = req.nextUrl.searchParams.get("status");
    const where: Record<string, unknown> = { restaurantId: tenant.id };
    if (
      status &&
      ["draft", "sent", "received", "cancelled"].includes(status)
    ) {
      where.status = status;
    }

    const purchaseOrders = await db.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(purchaseOrders);
  } catch (e) {
    console.error("GET /api/purchase-orders error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/purchase-orders — ustvari nov nabavni nalog (samo admin)
// Payload: { supplierId?, expectedDate?, items: [{name, inventoryItemId?, quantity, unit, unitCost}], discountPercent?, note? }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko ustvarja nabavne naloge" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      supplierId,
      expectedDate,
      items,
      discountPercent,
      note,
    } = body as {
      supplierId?: string | null;
      expectedDate?: string | null;
      items?: Array<{
        name: string;
        inventoryItemId?: string | null;
        quantity: number;
        unit?: string;
        unitCost: number;
      }>;
      discountPercent?: number;
      note?: string | null;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nabavni nalog mora imeti vsaj eno postavko" },
        { status: 400 }
      );
    }

    // Validacija posamezne postavke
    for (const it of items) {
      if (!it.name || typeof it.name !== "string" || !it.name.trim()) {
        return NextResponse.json(
          { error: "Vsaka postavka mora imeti ime" },
          { status: 400 }
        );
      }
      if (typeof it.quantity !== "number" || it.quantity <= 0) {
        return NextResponse.json(
          { error: `Količina za "${it.name}" mora biti pozitivna` },
          { status: 400 }
        );
      }
      if (typeof it.unitCost !== "number" || it.unitCost < 0) {
        return NextResponse.json(
          { error: `Cena za "${it.name}" ni veljavna` },
          { status: 400 }
        );
      }
    }

    // Validacija supplierId pripada tenantu (če je podan)
    let supplierIdResolved: string | null = null;
    if (supplierId && typeof supplierId === "string" && supplierId.trim()) {
      const sup = await db.supplier.findFirst({
        where: { id: supplierId, restaurantId: tenant.id },
      });
      if (!sup) {
        return NextResponse.json(
          { error: "Dobavitelj ni najden ali ne pripada restavraciji" },
          { status: 400 }
        );
      }
      supplierIdResolved = sup.id;
    }

    // Validacija inventoryItemIds (če so podani)
    const invIds = items
      .map((it) => it.inventoryItemId)
      .filter((x): x is string => typeof x === "string" && !!x.trim());
    if (invIds.length > 0) {
      const invItems = await db.inventoryItem.findMany({
        where: { id: { in: invIds }, restaurantId: tenant.id },
        select: { id: true },
      });
      const foundIds = new Set(invItems.map((i) => i.id));
      for (const it of items) {
        if (
          it.inventoryItemId &&
          typeof it.inventoryItemId === "string" &&
          it.inventoryItemId.trim() &&
          !foundIds.has(it.inventoryItemId)
        ) {
          return NextResponse.json(
            { error: `Inventarni izdelek za "${it.name}" ni najden` },
            { status: 400 }
          );
        }
      }
    }

    // Avtomatska generacija poNumber: PO-YYYY-XXX (inkrement po številu obstoječih)
    const year = new Date().getFullYear();
    const count = await db.purchaseOrder.count({
      where: { restaurantId: tenant.id },
    });
    const seq = String(count + 1).padStart(3, "0");
    const poNumber = `PO-${year}-${seq}`;

    // Če slučajno že obstaja (colizijsko), povečujemo dokler najdemo prostega
    let finalPoNumber = poNumber;
    let extraSeq = count + 1;
    while (
      await db.purchaseOrder.findFirst({
        where: { restaurantId: tenant.id, poNumber: finalPoNumber },
      })
    ) {
      extraSeq += 1;
      finalPoNumber = `PO-${year}-${String(extraSeq).padStart(3, "0")}`;
    }

    // Izračun postavk in skupnega zneska
    const discount = typeof discountPercent === "number" ? discountPercent : 0;
    const itemsData = items.map((it) => {
      const qty = it.quantity;
      const cost = it.unitCost;
      const lineTotal = qty * cost;
      return {
        inventoryItemId:
          it.inventoryItemId && typeof it.inventoryItemId === "string" && it.inventoryItemId.trim()
            ? it.inventoryItemId.trim()
            : null,
        name: it.name.trim(),
        quantity: qty,
        unit: it.unit || "kos",
        unitCost: cost,
        lineTotal,
      };
    });
    const subtotal = itemsData.reduce((sum, it) => sum + it.lineTotal, 0);
    const totalAmount = subtotal * (1 - discount / 100);

    const po = await db.purchaseOrder.create({
      data: {
        restaurantId: tenant.id,
        supplierId: supplierIdResolved,
        poNumber: finalPoNumber,
        status: "draft",
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount,
        discountPercent: discount,
        note: note?.trim() || null,
        operator: authOp.name,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (e) {
    console.error("POST /api/purchase-orders error:", e);
    return NextResponse.json(
      { error: "Napaka pri ustvarjanju nabavnega naloga" },
      { status: 500 }
    );
  }
}
