import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Redeem (uporabi) gift card — zmanjša balance
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amount } = body as { amount: number };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Znesek mora biti pozitiven" }, { status: 400 });
    }
    const card = await db.giftCard.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Gift card ni najden" }, { status: 404 });
    }
    if (card.status !== "active") {
      return NextResponse.json({ error: "Gift card ni aktiven" }, { status: 400 });
    }
    if (Number(card.balance) < amount) {
      return NextResponse.json({
        error: `Premajhno stanje (${Number(card.balance).toFixed(2)} €)`,
      }, { status: 400 });
    }
    const newBalance = Number(card.balance) - amount;
    const updated = await db.giftCard.update({
      where: { id },
      data: {
        balance: newBalance,
        status: Number(newBalance) <= 0 ? "used" : "active",
      },
    });
    return NextResponse.json({
      ok: true,
      balance: updated.balance,
      status: updated.status,
      redeemed: amount,
    });
  } catch (e) {
    console.error("POST /api/gift-cards/[id]/redeem error:", e);
    return NextResponse.json({ error: "Napaka pri uporabi gift card" }, { status: 500 });
  }
}
