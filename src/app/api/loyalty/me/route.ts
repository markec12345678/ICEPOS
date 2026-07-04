import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { verifyLoyaltyToken } from "@/lib/jwt";

// Extract + verify loyalty token from header or query
function extractLoyaltyToken(req: NextRequest): string | null {
  // 1. x-loyalty-token header (preferred)
  const headerToken = req.headers.get("x-loyalty-token");
  if (headerToken) return headerToken;
  // 2. ?token= query param (backward compat)
  const queryToken = req.nextUrl.searchParams.get("token");
  if (queryToken) return queryToken;
  return null;
}



export const dynamic = "force-dynamic";

// GET /api/loyalty/me — vrne podatke o stranki (JWT avtentikacija)
export async function GET(req: NextRequest) {
  try {
    const token = extractLoyaltyToken(req);
    if (!token) {
      return NextResponse.json({ error: "Manjka token" }, { status: 401 });
    }

    const payload = verifyLoyaltyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Neveljaven ali potekel token" }, { status: 401 });
    }

    const customer = await db.customer.findFirst({
      where: { id: payload.customerId, restaurantId: payload.restaurantId },
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
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

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
    console.error("GET /api/loyalty/me error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
