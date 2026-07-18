import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/equipment — vsa oprema z maintenance logi
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const equipment = await db.equipment.findMany({
      where: { restaurantId: tenant.id },
      include: {
        maintenanceLogs: {
          orderBy: { serviceDate: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    // Povzetek
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 dni

    const summary = {
      total: equipment.length,
      operational: equipment.filter((e) => e.status === "operational").length,
      maintenance: equipment.filter((e) => e.status === "maintenance").length,
      broken: equipment.filter((e) => e.status === "broken").length,
      retired: equipment.filter((e) => e.status === "retired").length,
      serviceOverdue: equipment.filter(
        (e) => e.nextServiceDate && e.nextServiceDate < now
      ).length,
      serviceSoon: equipment.filter(
        (e) =>
          e.nextServiceDate &&
          e.nextServiceDate >= now &&
          e.nextServiceDate <= soonThreshold
      ).length,
      totalValue: equipment.reduce((s, e) => s + e.purchaseCost, 0),
      totalMaintenanceCost: 0, // izračunano spodaj
    };

    // Skupni strošek vzdrževanja
    const allLogs = await db.equipmentMaintenance.findMany({
      where: {
        equipment: { restaurantId: tenant.id },
      },
      select: { cost: true },
    });
    summary.totalMaintenanceCost = allLogs.reduce((s, l) => s + l.cost, 0);

    return NextResponse.json({ equipment, summary });
  } catch (e) {
    console.error("GET /api/equipment error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju opreme" }, { status: 500 });
  }
}

// POST /api/equipment — dodaj novo opremo (admin)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja opremo" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      category,
      serialNumber,
      manufacturer,
      model,
      location,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      serviceIntervalDays,
      note,
    } = body as {
      name: string;
      category: string;
      serialNumber?: string;
      manufacturer?: string;
      model?: string;
      location?: string;
      purchaseDate?: string;
      purchaseCost?: number;
      warrantyExpiry?: string;
      serviceIntervalDays?: number;
      note?: string;
    };

    if (!name || !category) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, category)" },
        { status: 400 }
      );
    }

    const interval = serviceIntervalDays || 90;
    const now = new Date();
    const nextService = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const equipment = await db.equipment.create({
      data: {
        restaurantId: tenant.id,
        name,
        category,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        location: location || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || 0,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        serviceIntervalDays: interval,
        nextServiceDate: nextService,
        note: note || null,
        status: "operational",
      },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (e) {
    console.error("POST /api/equipment error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju opreme" }, { status: 500 });
  }
}
