import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/backup — izvozi vse podatke restavracije kot JSON
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json({ error: "Samo admin" }, { status: 403 });
    }

    // Pridobi vse podatke
    const [
      restaurant,
      menuItems,
      tables,
      operators,
      inventoryItems,
      customers,
      giftCards,
      happyHours,
      comboMeals,
      reservations,
      shifts,
      recentOrders,
    ] = await Promise.all([
      db.restaurant.findUnique({ where: { id: tenant.id } }),
      db.menuItem.findMany({ where: { restaurantId: tenant.id }, include: { modifiers: true, recipes: true } }),
      db.table.findMany({ where: { restaurantId: tenant.id } }),
      db.operator.findMany({ where: { restaurantId: tenant.id } }),
      db.inventoryItem.findMany({ where: { restaurantId: tenant.id } }),
      db.customer.findMany({ where: { restaurantId: tenant.id } }),
      db.giftCard.findMany({ where: { restaurantId: tenant.id } }),
      db.happyHour.findMany({ where: { restaurantId: tenant.id } }),
      db.comboMeal.findMany({ where: { restaurantId: tenant.id }, include: { slots: true } }),
      db.reservation.findMany({ where: { restaurantId: tenant.id } }),
      db.shift.findMany({ where: { restaurantId: tenant.id } }),
      db.order.findMany({
        where: { restaurantId: tenant.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      restaurant,
      menuItems,
      tables,
      operators,
      inventoryItems,
      customers,
      giftCards,
      happyHours,
      comboMeals,
      reservations,
      shifts,
      orders: recentOrders,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup_${tenant.slug}_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    console.error("GET /api/backup error:", e);
    return NextResponse.json({ error: "Napaka pri izvozu" }, { status: 500 });
  }
}
