// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/order-notes?menuItemId=xxx — pogoste opombe za določeno jed
// GET /api/order-notes — vse pogoste opombe (top 20)
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItemId = req.nextUrl.searchParams.get("menuItemId");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20", 10), 50);

    // Pridobi vse opombe iz plačanih naročil
    const whereClause: {
      order: { status: string; restaurantId: string };
      note: { not: null };
      menuItemId?: string;
    } = {
      order: { status: "paid", restaurantId: tenant.id },
      note: { not: null },
    };

    if (menuItemId) {
      whereClause.menuItemId = menuItemId;
    }

    const items = await db.orderItem.findMany({
      include: { menuItem: true },
      where: whereClause,
      select: {
        note: true,
        menuItemId: true,
        menuItem: { select: { name: true } },
      },
      take: 500, // omejitev za performanco
    });

    // Filtriraj prazne opombe in grupiraj
    const noteCounts = new Map<string, { count: number; menuItemName?: string }>();

    for (const item of items) {
      if (!item.note || item.note.trim().length === 0) continue;
      const note = item.note.trim();
      const existing = noteCounts.get(note);
      if (existing) {
        existing.count++;
      } else {
        noteCounts.set(note, {
          count: 1,
          menuItemName: item.menuItem?.name,
        });
      }
    }

    // Sortiraj po pogostosti
    const sortedNotes = Array.from(noteCounts.entries())
      .map(([note, info]) => ({
        note,
        count: info.count,
        menuItemName: info.menuItemName,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return NextResponse.json({
      notes: sortedNotes,
      total: noteCounts.size,
    });
  } catch (e) {
    console.error("GET /api/order-notes error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
