import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: preveri stanje gift card po kodi (path param ali ?code= query)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // id je lahko ali pravi ID ali koda (npr. GC-XXXX)
    let card = await db.giftCard.findFirst({
      where: { code: id.toUpperCase() },
    });
    if (!card) {
      card = await db.giftCard.findUnique({ where: { id } });
    }
    if (!card) {
      return NextResponse.json({ error: "Gift card ni najden" }, { status: 404 });
    }
    return NextResponse.json({
      id: card.id,
      code: card.code,
      balance: card.balance,
      initialAmount: card.initialAmount,
      status: card.status,
      customerName: card.customerName,
    });
  } catch (e) {
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.giftCard.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
