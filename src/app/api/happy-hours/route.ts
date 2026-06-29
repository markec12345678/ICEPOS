import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/happy-hours — vrne vse happy hour pravila za restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const happyHours = await db.happyHour.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(happyHours);
  } catch (e) {
    console.error("GET /api/happy-hours error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/happy-hours — ustvari novo happy hour pravilo (admin)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja happy hour pravila" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      daysOfWeek,
      startTime,
      endTime,
      discountType,
      discountValue,
      categories,
      menuItemIds,
    } = body as {
      name: string;
      daysOfWeek: number[];
      startTime: string;
      endTime: string;
      discountType: "percent" | "fixed";
      discountValue: number;
      categories?: string | string[];
      menuItemIds?: string | string[];
    };

    if (!name || !daysOfWeek || !startTime || !endTime || !discountType) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, daysOfWeek, startTime, endTime, discountType)" },
        { status: 400 }
      );
    }

    const hh = await db.happyHour.create({
      data: {
        restaurantId: tenant.id,
        name,
        daysOfWeek: JSON.stringify(daysOfWeek),
        startTime,
        endTime,
        discountType,
        discountValue: discountValue || 0,
        categories: typeof categories === "string"
          ? categories
          : categories
          ? JSON.stringify(categories)
          : "all",
        menuItemIds: typeof menuItemIds === "string"
          ? menuItemIds
          : menuItemIds
          ? JSON.stringify(menuItemIds)
          : "all",
        active: true,
      },
    });

    return NextResponse.json(hh, { status: 201 });
  } catch (e) {
    console.error("POST /api/happy-hours error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju" }, { status: 500 });
  }
}
