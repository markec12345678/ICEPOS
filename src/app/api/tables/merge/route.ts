import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/tables/merge — združi dve mizi (prenese naročilo iz source na target)
// Body: { sourceTableId, targetTableId }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { sourceTableId, targetTableId } = body as {
      sourceTableId: string;
      targetTableId: string;
    };

    if (!sourceTableId || !targetTableId) {
      return NextResponse.json({ error: "Manjkajoči parametri" }, { status: 400 });
    }

    if (sourceTableId === targetTableId) {
      return NextResponse.json({ error: "Miza ne more biti združena sama s seboj" }, { status: 400 });
    }

    // Preveri obe mizi
    const [sourceTable, targetTable] = await Promise.all([
      db.table.findFirst({ where: { id: sourceTableId, restaurantId: tenant.id } }),
      db.table.findFirst({ where: { id: targetTableId, restaurantId: tenant.id } }),
    ]);

    if (!sourceTable) {
      return NextResponse.json({ error: "Izhodiščna miza ni najdena" }, { status: 404 });
    }
    if (!targetTable) {
      return NextResponse.json({ error: "Ciljna miza ni najdena" }, { status: 404 });
    }

    // Pridobi odprto naročilo na source mizi
    const sourceOrder = await db.order.findFirst({
      where: { tableId: sourceTableId, status: "open" },
      include: { items: true },
    });

    if (!sourceOrder) {
      return NextResponse.json({ error: "Izhodiščna miza nima odprtega naročila" }, { status: 400 });
    }

    // Preveri ali target miza že ima odprto naročilo
    const targetOrder = await db.order.findFirst({
      where: { tableId: targetTableId, status: "open" },
      include: { items: true },
    });

    if (targetOrder) {
      // Prenesi postavke iz source na target naročilo
      await db.orderItem.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id },
      });

      // Posodobi skupni znesek target naročila
      const allItems = [...targetOrder.items, ...sourceOrder.items];
      const newTotal = allItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const newVatTotal = allItems.reduce((s, i) => s + i.unitPrice * i.quantity * i.vatRate, 0);

      await db.order.update({
        where: { id: targetOrder.id },
        data: { total: newTotal, vatTotal: newVatTotal },
      });

      // Označi source naročilo kot preneseno (status cancelled z note)
      await db.order.update({
        where: { id: sourceOrder.id },
        data: {
          status: "cancelled",
          total: 0,
          vatTotal: 0,
        },
      });
    } else {
      // Preprosto prestavi naročilo na novo mizo
      await db.order.update({
        where: { id: sourceOrder.id },
        data: { tableId: targetTableId },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Miza ${sourceTable.name} združena z mizo ${targetTable.name}`,
      sourceTable: { id: sourceTable.id, name: sourceTable.name },
      targetTable: { id: targetTable.id, name: targetTable.name },
      transferredItems: sourceOrder.items.length,
    });
  } catch (e) {
    console.error("POST /api/tables/merge error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
