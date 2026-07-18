import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/staff-meals — seznam obrokov zaposlenih
// Podpora za ?from=&to=&operatorId=
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const operatorId = req.nextUrl.searchParams.get("operatorId");

    const now = new Date();
    const startDate = from ? new Date(from + "T00:00:00") : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to + "T23:59:59") : now;

    // Staff meals so Orders z flags, ki vsebujejo "staff_meal"
    const where: {
      restaurantId: string;
      status: string;
      createdAt: { gte: Date; lte: Date };
      flags?: { contains: string };
      operator?: string;
    } = {
      restaurantId: tenant.id,
      status: "paid",
      createdAt: { gte: startDate, lte: endDate },
      flags: { contains: "staff_meal" },
    };

    // Filter po operatorju (preko operator polja)
    if (operatorId) {
      const operator = await db.operator.findFirst({
        where: { id: operatorId, restaurantId: tenant.id },
      });
      if (operator) {
        where.operator = operator.name;
      }
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { items: { include: { menuItem: true } } },
    });

    const items = orders.map((o) => {
      const flags = o.flags ? JSON.parse(o.flags) : [];
      const discountPercent = flags.find((f: string) => f.startsWith("discount:"))?.replace("discount:", "");
      const mealType = flags.find((f: string) => f.startsWith("meal_type:"))?.replace("meal_type:", "") || "lunch";
      const originalTotal = o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

      return {
        id: o.id,
        invoiceNumber: o.invoiceNumber,
        receiptNo: o.receiptNo,
        operator: o.operator,
        createdAt: o.createdAt.toISOString(),
        total: o.total,
        originalTotal,
        discount: originalTotal - o.total,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        mealType,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };
    });

    // Agregacija po operaterjih
    const byOperator = new Map<
      string,
      { operator: string; count: number; totalDiscount: number; totalOriginal: number; totalPaid: number }
    >();

    for (const item of items) {
      const existing = byOperator.get(item.operator);
      if (existing) {
        existing.count++;
        existing.totalDiscount += item.discount;
        existing.totalOriginal += item.originalTotal;
        existing.totalPaid += item.total;
      } else {
        byOperator.set(item.operator, {
          operator: item.operator,
          count: 1,
          totalDiscount: item.discount,
          totalOriginal: item.originalTotal,
          totalPaid: item.total,
        });
      }
    }

    // Agregacija po datumih
    const byDate = new Map<
      string,
      { date: string; count: number; totalDiscount: number; totalPaid: number }
    >();

    for (const item of items) {
      const dateKey = item.createdAt.slice(0, 10);
      const existing = byDate.get(dateKey);
      if (existing) {
        existing.count++;
        existing.totalDiscount += item.discount;
        existing.totalPaid += item.total;
      } else {
        byDate.set(dateKey, {
          date: dateKey,
          count: 1,
          totalDiscount: item.discount,
          totalPaid: item.total,
        });
      }
    }

    // Operators list za filter
    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id, active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      period: {
        from: startDate.toISOString().slice(0, 10),
        to: endDate.toISOString().slice(0, 10),
      },
      items,
      byOperator: Array.from(byOperator.values()).sort((a, b) => b.count - a.count),
      byDate: Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date)),
      operators,
      summary: {
        total: items.length,
        totalDiscount: items.reduce((s, i) => s + i.discount, 0),
        totalOriginal: items.reduce((s, i) => s + i.originalTotal, 0),
        totalPaid: items.reduce((s, i) => s + i.total, 0),
        avgDiscount:
          items.length > 0
            ? items.reduce((s, i) => s + i.discount, 0) / items.length
            : 0,
        uniqueOperators: byOperator.size,
      },
    });
  } catch (e) {
    console.error("GET /api/staff-meals error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju obrokov zaposlenih" }, { status: 500 });
  }
}

// POST /api/staff-meals — ustvari obrok zaposlenega
// Body: { items: [{menuItemId, quantity}], operatorId, discountPercent, mealType }
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
    const { items, operatorId, discountPercent = 50, mealType = "lunch" } = body as {
      items: Array<{ menuItemId: string; quantity: number }>;
      operatorId: string;
      discountPercent?: number;
      mealType?: string;
    };

    if (!items || items.length === 0 || !operatorId) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (items, operatorId)" },
        { status: 400 }
      );
    }

    // Pridobi operaterja
    const operator = await db.operator.findFirst({
      where: { id: operatorId, restaurantId: tenant.id, active: true },
    });

    if (!operator) {
      return NextResponse.json({ error: "Operater ni najden" }, { status: 404 });
    }

    // Pridobi meni item-e
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId: tenant.id },
    });

    if (menuItems.length !== items.length) {
      return NextResponse.json({ error: "Nekatere meni postavke niso najdene" }, { status: 400 });
    }

    // Poišči prvo mizo (za staff meals uporabimo prvo mizo kot placeholder)
    const firstTable = await db.table.findFirst({
      where: { restaurantId: tenant.id },
      orderBy: { number: "asc" },
    });

    if (!firstTable) {
      return NextResponse.json({ error: "Ni najdenih miz" }, { status: 400 });
    }

    // Izračunaj cene z popustom
    let total = 0;
    let vatTotal = 0;
    const orderItems = items.map((i) => {
      const menuItem = menuItems.find((m) => m.id === i.menuItemId)!;
      const basePrice = menuItem.price * i.quantity;
      const discountedPrice = basePrice * (1 - discountPercent / 100);
      total += discountedPrice;
      vatTotal += (discountedPrice / (1 + menuItem.vatRate)) * menuItem.vatRate;
      return {
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        unitPrice: discountedPrice / i.quantity, // cena na enoto s popustom
        vatRate: menuItem.vatRate,
      };
    });

    // Ustvari Order z flags
    const flags = ["staff_meal", `discount:${discountPercent}`, `meal_type:${mealType}`];

    const order = await db.order.create({
      data: {
        restaurantId: tenant.id,
        tableId: firstTable.id,
        status: "paid",
        total: Math.round(total * 100) / 100,
        vatTotal: Math.round(vatTotal * 100) / 100,
        paymentMethod: "staff_meal",
        operator: operator.name,
        operatorTaxNo: operator.taxNumber,
        paidAt: new Date(),
        flags: JSON.stringify(flags),
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    console.error("POST /api/staff-meals error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju obroka" }, { status: 500 });
  }
}
