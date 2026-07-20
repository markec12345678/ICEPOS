import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Loyalty tier definicije
const TIERS = [
  {
    key: "bronze",
    label: "Bron",
    minSpent: 0,
    color: "amber",
    discountPercent: 0,
    pointsMultiplier: 1,
    perks: ["Zbiranje točk (1:1)"],
  },
  {
    key: "silver",
    label: "Srebro",
    minSpent: 200,
    color: "slate",
    discountPercent: 5,
    pointsMultiplier: 1.2,
    perks: ["5% popust na vse", "1.2x točk", "Prednostna rezervacija"],
  },
  {
    key: "gold",
    label: "Zlato",
    minSpent: 500,
    color: "yellow",
    discountPercent: 10,
    pointsMultiplier: 1.5,
    perks: ["10% popust na vse", "1.5x točk", "Brezplačna pijača ob obisku", "Prednostna rezervacija"],
  },
  {
    key: "platinum",
    label: "Platina",
    minSpent: 1500,
    color: "purple",
    discountPercent: 15,
    pointsMultiplier: 2,
    perks: ["15% popust na vse", "2x točk", "Brezplačna pijača ob obisku", "VIP miza", "Dedicated kontakt", "Ekskluzivne degustacije"],
  },
];

export function getTierForSpent(totalSpent: number) {
  let currentTier = TIERS[0];
  let nextTier: (typeof TIERS)[number] | null = null;

  for (let i = 0; i < TIERS.length; i++) {
    if (totalSpent >= TIERS[i].minSpent) {
      currentTier = TIERS[i];
      nextTier = i + 1 < TIERS.length ? TIERS[i + 1] : null;
    }
  }

  const progressToNext = nextTier
    ? Math.min(
        100,
        ((totalSpent - currentTier.minSpent) /
          (nextTier.minSpent - currentTier.minSpent)) *
          100
      )
    : 100;

  const remainingToNext = nextTier
    ? nextTier.minSpent - totalSpent
    : 0;

  return {
    currentTier,
    nextTier,
    progressToNext,
    remainingToNext,
  };
}

// GET /api/loyalty-tiers — pregled nivojev zvestobe + segmentacija strank
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { totalSpent: "desc" },
    });

    // Segmentacija strank po nivojih
    const tierCounts = TIERS.map((tier) => {
      const customersInTier = customers.filter((c) => {
        const { currentTier } = getTierForSpent(c.totalSpent);
        return currentTier.key === tier.key;
      });

      return {
        ...tier,
        customerCount: customersInTier.length,
        totalSpent: customersInTier.reduce((s, c) => s + c.totalSpent, 0),
        totalPoints: customersInTier.reduce((s, c) => s + c.points, 0),
        avgSpent:
          customersInTier.length > 0
            ? customersInTier.reduce((s, c) => s + c.totalSpent, 0) /
              customersInTier.length
            : 0,
      };
    });

    // Top stranke (z najvišjim totalSpent)
    const topCustomers = customers.slice(0, 20).map((c) => {
      const tierInfo = getTierForSpent(c.totalSpent);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalSpent: c.totalSpent,
        visitCount: c.visitCount,
        points: c.points,
        currentTier: tierInfo.currentTier.key,
        currentTierLabel: tierInfo.currentTier.label,
        nextTier: tierInfo.nextTier?.key || null,
        progressToNext: tierInfo.progressToNext,
        remainingToNext: tierInfo.remainingToNext,
      };
    });

    // Stranke blizu naslednjega nivoja (progress > 80%)
    const nearUpgrade = customers
      .map((c) => {
        const tierInfo = getTierForSpent(c.totalSpent);
        return {
          id: c.id,
          name: c.name,
          totalSpent: c.totalSpent,
          currentTier: tierInfo.currentTier.label,
          nextTier: tierInfo.nextTier?.label || null,
          progressToNext: tierInfo.progressToNext,
          remainingToNext: tierInfo.remainingToNext,
        };
      })
      .filter((c) => c.nextTier && c.progressToNext >= 80 && c.progressToNext < 100)
      .sort((a, b) => b.progressToNext - a.progressToNext);

    return NextResponse.json({
      tiers: TIERS,
      tierCounts,
      topCustomers,
      nearUpgrade,
      summary: {
        totalCustomers: customers.length,
        totalSpent: customers.reduce((s, c) => s + c.totalSpent, 0),
        totalPoints: customers.reduce((s, c) => s + c.points, 0),
        avgSpentPerCustomer:
          customers.length > 0
            ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length
            : 0,
      },
    });
  } catch (e) {
    console.error("GET /api/loyalty-tiers error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju nivojev zvestobe" }, { status: 500 });
  }
}
