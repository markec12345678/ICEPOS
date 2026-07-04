import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/restaurants — vrne vse aktivne restavracije (za selector)
// Vrne SAMO minimalne podatke — brez občutljivih (taxNumber, email, phone, itd.)
export async function GET() {
  try {
    const restaurants = await db.restaurant.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        city: true,
      },
    });
    return NextResponse.json(restaurants);
  } catch (e) {
    console.error("GET /api/restaurants error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/restaurants — ustvari novo restavracijo (super-admin only)
// Zahteva x-super-admin-key header, ki se primerja z SUPER_ADMIN_KEY env var.
export async function POST(req: NextRequest) {
  try {
    // === Super-admin avtentikacija ===
    const superAdminKey = req.headers.get("x-super-admin-key");
    const expectedKey = process.env.SUPER_ADMIN_KEY;
    if (!expectedKey || superAdminKey !== expectedKey) {
      return NextResponse.json(
        { error: "Dostop zavrnjen — zahteva super-admin ključ" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      subdomain,
      address,
      city,
      phone,
      email,
      taxNumber,
      businessUnit,
      cashRegister,
      fursEnv,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, slug)" },
        { status: 400 }
      );
    }

    // Preveri unikatnost slug-a
    const existing = await db.restaurant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Slug je že uporabljen" },
        { status: 409 }
      );
    }

    const restaurant = await db.restaurant.create({
      data: {
        name,
        slug,
        subdomain: subdomain || null,
        address: address || null,
        city: city || null,
        phone: phone || null,
        email: email || null,
        taxNumber: taxNumber || "SI00000000",
        businessUnit: businessUnit || "PP001",
        cashRegister: cashRegister || "BLAG01",
        fursEnv: fursEnv || "test",
      },
    });

    return NextResponse.json(restaurant, { status: 201 });
  } catch (e) {
    console.error("POST /api/restaurants error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju" }, { status: 500 });
  }
}
