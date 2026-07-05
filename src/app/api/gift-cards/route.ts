import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validate, CreateGiftCardSchema } from "@/lib/validation";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function genCode(): string {
  return "GC-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Vse gift cards za trenutno restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }
    const cards = await db.giftCard.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(cards);
  } catch (e) {
    console.error("GET /api/gift-cards error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Ustvari novo gift card
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }
    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna je prijava" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = validate(CreateGiftCardSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vhod", details: parsed.error }, { status: 400 });
    }
    const { amount, customerName, note } = body as {
      amount: number;
      customerName?: string;
      note?: string;
    };
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Znesek mora biti pozitiven" }, { status: 400 });
    }
    // Generiraj unikatno kodo znotraj te restavracije
    let code = genCode();
    let existing = await db.giftCard.findFirst({ where: { code, restaurantId: tenant.id } });
    while (existing) {
      code = genCode();
      existing = await db.giftCard.findFirst({ where: { code, restaurantId: tenant.id } });
    }
    const card = await db.giftCard.create({
      data: {
        code,
        balance: amount,
        initialAmount: amount,
        customerName: customerName?.trim() || null,
        note: note?.trim() || null,
        status: "active",
        restaurantId: tenant.id,
      },
    });
    return NextResponse.json(card, { status: 201 });
  } catch (e) {
    console.error("POST /api/gift-cards error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
