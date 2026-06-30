import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/combos — vrne vse combo menije za restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const combos = await db.comboMeal.findMany({
      where: { restaurantId: tenant.id },
      include: { slots: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(combos);
  } catch (e) {
    console.error("GET /api/combos error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/combos — ustvari nov combo meni (admin)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja combo menije" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, price, icon, slots } = body as {
      name: string;
      description?: string;
      price: number;
      icon?: string;
      slots: {
        name: string;
        required: boolean;
        minSelect: number;
        maxSelect: number;
        itemIds: string[];
      }[];
    };

    if (!name || !price || !slots || slots.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, price, slots)" },
        { status: 400 }
      );
    }

    const combo = await db.comboMeal.create({
      data: {
        restaurantId: tenant.id,
        name,
        description: description || null,
        price,
        icon: icon || null,
        active: true,
        slots: {
          create: slots.map((s) => ({
            name: s.name,
            required: s.required ?? true,
            minSelect: s.minSelect ?? 1,
            maxSelect: s.maxSelect ?? 1,
            itemIds: JSON.stringify(s.itemIds),
          })),
        },
      },
      include: { slots: true },
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (e) {
    console.error("POST /api/combos error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju" }, { status: 500 });
  }
}
