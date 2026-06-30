import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Rewards catalog (hardcoded — v produkciji bi lahko v DB)
const REWARDS = [
  { id: "free_coffee", name: "Brezplačna kava", pointsCost: 15, icon: "☕", desc: "Espresso ali Cappuccino" },
  { id: "free_dessert", name: "Brezplačna sladica", pointsCost: 30, icon: "🍰", desc: "Gibanica ali potica" },
  { id: "free_beer", name: "Brezplačno pivo", pointsCost: 25, icon: "🍺", desc: "Laško ali Union 0.5l" },
  { id: "free_appetizer", name: "Brezplačna predjed", pointsCost: 40, icon: "🥗", desc: "Pršut z melono ali sirna deska" },
  { id: "discount_10", name: "10€ popust", pointsCost: 100, icon: "💰", desc: "10€ popust na naslednji račun" },
  { id: "free_main", name: "Brezplačna glavna jed", pointsCost: 80, icon: "🍽️", desc: "Ena glavna jed do 15€" },
  { id: "discount_25", name: "25€ popust", pointsCost: 250, icon: "💸", desc: "25€ popust na naslednji račun" },
  { id: "free_dinner", name: "Večerja za 2", pointsCost: 500, icon: "🥂", desc: "Večerja za 2 osebi do 60€" },
];

// GET /api/loyalty/redeem — vrne rewards catalog
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const token = req.nextUrl.searchParams.get("token");
    let customerPoints = 0;
    if (token) {
      const customer = await db.customer.findFirst({
        where: { id: token, restaurantId: tenant.id },
        select: { points: true },
      });
      if (customer) customerPoints = customer.points;
    }

    return NextResponse.json({
      rewards: REWARDS.map((r) => ({
        ...r,
        available: customerPoints >= r.pointsCost,
      })),
      customerPoints,
    });
  } catch (e) {
    console.error("GET /api/loyalty/redeem error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/loyalty/redeem — unovči točke za reward
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { token, rewardId } = body as { token: string; rewardId: string };

    if (!token || !rewardId) {
      return NextResponse.json({ error: "Manjkajoči podatki" }, { status: 400 });
    }

    const reward = REWARDS.find((r) => r.id === rewardId);
    if (!reward) {
      return NextResponse.json({ error: "Nagrada ni najdena" }, { status: 404 });
    }

    const customer = await db.customer.findFirst({
      where: { id: token, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    if (customer.points < reward.pointsCost) {
      return NextResponse.json(
        { error: `Premalo točk. Potrebno: ${reward.pointsCost}, na voljo: ${customer.points}` },
        { status: 400 }
      );
    }

    // Odštej točke
    const updated = await db.customer.update({
      where: { id: customer.id },
      data: { points: { decrement: reward.pointsCost } },
      select: { points: true, name: true },
    });

    return NextResponse.json({
      success: true,
      message: `Uspešno unovčeno: ${reward.name}`,
      reward,
      remainingPoints: updated.points,
      // Voucher code za prevzem
      voucherCode: `V-${Date.now().toString(36).toUpperCase()}-${reward.id.slice(0, 4).toUpperCase()}`,
    });
  } catch (e) {
    console.error("POST /api/loyalty/redeem error:", e);
    return NextResponse.json({ error: "Napaka pri unovčevanju" }, { status: 500 });
  }
}
