import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { signLoyaltyToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

// POST /api/loyalty/login — prijava stranke s telefonsko številko
// Vrne customer podatke + points + simple token (customerId)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { phone } = body as { phone: string };

    if (!phone || phone.trim().length < 6) {
      return NextResponse.json(
        { error: "Vnesi veljavno telefonsko številko" },
        { status: 400 }
      );
    }

    // Poišči stranko po telefonu
    const customer = await db.customer.findFirst({
      where: {
        phone: phone.trim(),
        restaurantId: tenant.id,
      },
      include: {
        orders: {
          where: { status: "paid" },
          orderBy: { paidAt: "desc" },
          take: 20,
          select: {
            id: true,
            total: true,
            tip: true,
            paidAt: true,
            invoiceNumber: true,
            paymentMethod: true,
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                menuItem: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Stranka s to telefonsko številko ni najdena. Vprašajte natakarja za registracijo." },
        { status: 404 }
      );
    }

    // Izračunaj reward level
    const points = customer.points;
    let level = "Bronca";
    let nextLevel: string | null = "Srebro";
    let pointsToNext = 100 - points;
    if (points >= 500) {
      level = "Zlato";
      nextLevel = null;
      pointsToNext = 0;
    } else if (points >= 200) {
      level = "Srebro";
      nextLevel = "Zlato";
      pointsToNext = 500 - points;
    } else if (points >= 100) {
      level = "Bronca";
      nextLevel = "Srebro";
      pointsToNext = 200 - points;
    } else {
      level = "Novinec";
      nextLevel = "Bronca";
      pointsToNext = 100 - points;
    }

    return NextResponse.json({
      token: signLoyaltyToken(customer.id, tenant.id), // JWT (HS256, 30-day TTL)
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        points,
        totalSpent: customer.totalSpent,
        visitCount: customer.visitCount,
        level,
        nextLevel,
        pointsToNext,
        note: customer.note,
        allergens: customer.allergens,
        createdAt: customer.createdAt,
      },
      orders: customer.orders.map((o) => ({
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        total: o.total,
        tip: o.tip,
        paidAt: o.paidAt,
        paymentMethod: o.paymentMethod,
        items: o.items.map((it) => ({
          name: it.menuItem.name,
          quantity: it.quantity,
          price: it.unitPrice,
        })),
      })),
    });
  } catch (e) {
    console.error("POST /api/loyalty/login error:", e);
    return NextResponse.json({ error: "Napaka pri prijavi" }, { status: 500 });
  }
}
