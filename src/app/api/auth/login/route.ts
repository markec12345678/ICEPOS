import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/auth/login — preveri PIN in vrne operaterja + restavracijo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin, restaurantSlug } = body as { pin: string; restaurantSlug?: string };

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: "PIN mora biti 4-mesten" },
        { status: 400 }
      );
    }

    // Določi tenant: iz body-ja (slug) ali header-ja
    let tenant;
    if (restaurantSlug) {
      tenant = await db.restaurant.findUnique({
        where: { slug: restaurantSlug },
      });
    } else {
      tenant = await getTenantFromRequest(req);
    }

    if (!tenant || !tenant.active) {
      return NextResponse.json(
        { error: "Restavracija ni najdena. Izberi restavracijo." },
        { status: 404 }
      );
    }

    const operator = await db.operator.findFirst({
      where: { pin, restaurantId: tenant.id, active: true },
    });

    if (!operator) {
      return NextResponse.json(
        { error: "Napačen PIN za to restavracijo" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: operator.id,
      name: operator.name,
      taxNumber: operator.taxNumber,
      role: operator.role,
      restaurantId: tenant.id,
      restaurantName: tenant.name,
      restaurantSlug: tenant.slug,
      businessUnit: tenant.businessUnit,
      cashRegister: tenant.cashRegister,
      loginAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ error: "Napaka pri prijavi" }, { status: 500 });
  }
}
