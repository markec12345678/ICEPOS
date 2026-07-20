import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";
import { getAllRestaurants } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/stock-transfers — seznam prenosov
// Podpora za ?status=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const statusFilter = req.nextUrl.searchParams.get("status");

    const where: { restaurantId: string; status?: string } = { restaurantId: tenant.id };
    if (statusFilter && statusFilter !== "all") {
      where.status = statusFilter;
    }

    const transfers = await db.stockTransfer.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // Pridobi vse restavracije za prikaz imen
    const allRestaurants = await getAllRestaurants();

    const items = transfers.map((t) => ({
      ...t,
      toRestaurantDisplayName: t.toRestaurantName,
    }));

    const summary = {
      total: transfers.length,
      draft: transfers.filter((t) => t.status === "draft").length,
      sent: transfers.filter((t) => t.status === "sent").length,
      received: transfers.filter((t) => t.status === "received").length,
      cancelled: transfers.filter((t) => t.status === "cancelled").length,
      totalValue: transfers
        .filter((t) => t.status === "received")
        .reduce((s, t) => s + t.totalValue, 0),
    };

    return NextResponse.json({
      items,
      restaurants: allRestaurants.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
      summary,
    });
  } catch (e) {
    console.error("GET /api/stock-transfers error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju prenosov" }, { status: 500 });
  }
}

// POST /api/stock-transfers — ustvari nov prenos
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko ustvarja prenose zalog" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { toRestaurantId, items, note } = body as {
      toRestaurantId: string;
      items: Array<{
        inventoryItemId?: string;
        name: string;
        quantity: number;
        unit?: string;
        unitCost?: number;
      }>;
      note?: string;
    };

    if (!toRestaurantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (toRestaurantId, items)" },
        { status: 400 }
      );
    }

    if (toRestaurantId === tenant.id) {
      return NextResponse.json(
        { error: "Ciljna restavracija mora biti drugačna od izvorne" },
        { status: 400 }
      );
    }

    // Preveri, da ciljna restavracija obstaja
    const toRestaurant = await db.restaurant.findUnique({
      where: { id: toRestaurantId },
    });
    if (!toRestaurant) {
      return NextResponse.json({ error: "Ciljna restavracija ni najdena" }, { status: 404 });
    }

    // Generiraj transferNumber
    const count = await db.stockTransfer.count({
      where: { restaurantId: tenant.id },
    });
    const year = new Date().getFullYear();
    const transferNumber = `ST-${year}-${String(count + 1).padStart(3, "0")}`;

    // Izračunaj totalItems in totalValue
    const totalItems = items.length;
    const totalValue = items.reduce(
      (s, i) => s + i.quantity * (i.unitCost || 0),
      0
    );

    const transfer = await db.stockTransfer.create({
      data: {
        restaurantId: tenant.id,
        toRestaurantId,
        toRestaurantName: toRestaurant.name,
        transferNumber,
        status: "draft",
        totalItems,
        totalValue,
        note: note || null,
        operator: authOp.name,
        items: {
          create: items.map((i) => ({
            inventoryItemId: i.inventoryItemId || null,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit || "kos",
            unitCost: i.unitCost || 0,
            lineTotal: i.quantity * (i.unitCost || 0),
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (e) {
    console.error("POST /api/stock-transfers error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju prenosa" }, { status: 500 });
  }
}
