import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena. Pošlji x-restaurant-id ali x-restaurant-slug header." },
        { status: 400 }
      );
    }

    const items = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/menu error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, category, price, vatRate, desc } = body as {
      name: string;
      category: string;
      price: number;
      vatRate: number;
      desc?: string;
    };
    if (!name || !category || typeof price !== "number") {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, category, price)" },
        { status: 400 }
      );
    }
    const item = await db.menuItem.create({
      data: {
        name,
        category,
        price,
        vatRate: typeof vatRate === "number" ? vatRate : 0.095,
        desc: desc || null,
        available: true,
        restaurantId: tenant.id,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error("POST /api/menu error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
