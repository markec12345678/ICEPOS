import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// VIP milestone nagrade
const VIP_MILESTONES = [
  { threshold: 500, bonusPoints: 50, label: "Bronca VIP", emoji: "🥉" },
  { threshold: 1000, bonusPoints: 100, label: "Srebro VIP", emoji: "🥈" },
  { threshold: 2000, bonusPoints: 250, label: "Zlato VIP", emoji: "🥇" },
  { threshold: 5000, bonusPoints: 500, label: "Platinum VIP", emoji: "💎" },
];

// POST /api/customers/[id]/vip-bonus — dodeli VIP bonus točke stranki
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { milestoneThreshold } = body as { milestoneThreshold?: number };

    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid" },
          select: { total: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    const totalSpent = customer.orders.reduce((s, o) => s + o.total, 0);

    // Najdi milestone (ali uporabi podani threshold)
    const milestone = milestoneThreshold
      ? VIP_MILESTONES.find((m) => m.threshold === milestoneThreshold)
      : VIP_MILESTONES.filter((m) => totalSpent >= m.threshold).pop();

    if (!milestone) {
      return NextResponse.json(
        { error: "Stranka še ni dosegla VIP milestone" },
        { status: 400 }
      );
    }

    // Dodeli bonus točke
    const updatedCustomer = await db.customer.update({
      where: { id },
      data: { points: { increment: milestone.bonusPoints } },
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        points: updatedCustomer.points,
      },
      milestone: {
        label: milestone.label,
        emoji: milestone.emoji,
        bonusPoints: milestone.bonusPoints,
        threshold: milestone.threshold,
      },
      message: `${milestone.emoji} ${updatedCustomer.name} je prejel/a ${milestone.bonusPoints} bonus točk (${milestone.label})!`,
    });
  } catch (e) {
    console.error("POST /api/customers/[id]/vip-bonus error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// GET /api/customers/[id]/vip-bonus — vrne VIP milestone informacije za stranko
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
      include: {
        orders: {
          where: { status: "paid" },
          select: { total: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    const totalSpent = customer.orders.reduce((s, o) => s + o.total, 0);
    const achievedMilestones = VIP_MILESTONES.filter((m) => totalSpent >= m.threshold);
    const nextMilestone = VIP_MILESTONES.find((m) => totalSpent < m.threshold);

    return NextResponse.json({
      totalSpent: Math.round(totalSpent * 100) / 100,
      achievedMilestones,
      nextMilestone: nextMilestone
        ? {
            ...nextMilestone,
            progress: Math.round((totalSpent / nextMilestone.threshold) * 100),
            remaining: Math.round((nextMilestone.threshold - totalSpent) * 100) / 100,
          }
        : null,
      allMilestones: VIP_MILESTONES,
    });
  } catch (e) {
    console.error("GET /api/customers/[id]/vip-bonus error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
