import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/search?q=xxx — hitro iskanje strank po imenu/telefonu/email
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "10", 10), 20);

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const customers = await db.customer.findMany({
      where: {
        restaurantId: tenant.id,
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        points: true,
        totalSpent: true,
        visitCount: true,
        note: true,
        createdAt: true,
      },
      orderBy: { totalSpent: "desc" },
      take: limit,
    });

    return NextResponse.json({
      results: customers,
      query: q,
    });
  } catch (e) {
    console.error("GET /api/customers/search error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
