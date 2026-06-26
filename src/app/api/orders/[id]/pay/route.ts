import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Zaključi (plača) naročilo — generira demo SRS številko računa
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const paymentMethod: "cash" | "card" =
      body.paymentMethod === "card" ? "card" : "cash";

    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Naročilo ni najdeno" },
        { status: 404 }
      );
    }
    if (order.status !== "open") {
      return NextResponse.json(
        { error: "Naročilo je že zaključeno" },
        { status: 400 }
      );
    }

    // Demo SRS številka računa (v realni implementaciji: FURS XML podpis)
    const receiptNo = `SI-${new Date().getFullYear()}-${String(
      Math.floor(Math.random() * 9000000) + 1000000
    )}`;
    const zoi = Array.from({ length: 32 }, () =>
      "0123456789ABCDEF"[Math.floor(Math.random() * 16)]
    ).join("");

    const paid = await db.order.update({
      where: { id },
      data: {
        status: "paid",
        paymentMethod,
        paidAt: new Date(),
        receiptNo,
      },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // Vrnemo tudi ZOI (zaščitna oznaka izdajatelja) za demo
    return NextResponse.json({ ...paid, zoi });
  } catch (e) {
    console.error("POST /api/orders/[id]/pay error:", e);
    return NextResponse.json(
      { error: "Napaka pri zaključevanju računa" },
      { status: 500 }
    );
  }
}
