import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Preseli odprto naročilo na drugo mizo (table transfer)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { targetTableId } = body as { targetTableId: string };

    if (!targetTableId) {
      return NextResponse.json(
        { error: "Manjka ciljna miza" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id },
      include: { table: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Naročilo ni najdeno" },
        { status: 404 }
      );
    }
    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Lahko se preseli le odprto naročilo" },
        { status: 400 }
      );
    }
    if (order.tableId === targetTableId) {
      return NextResponse.json(
        { error: "Ciljna miza je enaka izvorni" },
        { status: 400 }
      );
    }

    // Preveri da ciljna miza nima odprtega naročila
    const targetHasOpen = await db.order.findFirst({
      where: { tableId: targetTableId, status: "open" },
    });
    if (targetHasOpen) {
      return NextResponse.json(
        { error: "Ciljna miza že ima odprto naročilo" },
        { status: 400 }
      );
    }

    const targetTable = await db.table.findUnique({
      where: { id: targetTableId },
    });
    if (!targetTable) {
      return NextResponse.json(
        { error: "Ciljna miza ne obstaja" },
        { status: 404 }
      );
    }

    const updated = await db.order.update({
      where: { id },
      data: { tableId: targetTableId },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Naročilo preseljeno: ${order.table.name} → ${targetTable.name}`,
      order: updated,
    });
  } catch (e) {
    console.error("POST /api/orders/[id]/transfer-table error:", e);
    return NextResponse.json(
      { error: "Napaka pri preselitvi mize" },
      { status: 500 }
    );
  }
}
