import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vsi operaterji za trenutno restavracijo
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const operators = await db.operator.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });
    // Ne vrni PIN-a v odgovoru (varnost)
    return NextResponse.json(
      operators.map((o) => ({
        id: o.id,
        name: o.name,
        pin: o.pin, // potreben za clock in/out gumb v scheduling view
        taxNumber: o.taxNumber,
        role: o.role,
        hourlyRate: o.hourlyRate,
        active: o.active,
        createdAt: o.createdAt,
      }))
    );
  } catch (e) {
    console.error("GET /api/operators error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Nov operater (samo admin)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja operaterje" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, pin, taxNumber, role, hourlyRate } = body as {
      name: string;
      pin: string;
      taxNumber?: string;
      role?: string;
      hourlyRate?: number;
    };

    if (!name || !pin || pin.length !== 4) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, 4-mesten pin)" },
        { status: 400 }
      );
    }

    // Preveri unikatnost PIN-a znotraj te restavracije
    const existing = await db.operator.findFirst({
      where: { pin, restaurantId: tenant.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "PIN je že v uporabi v tej restavraciji" },
        { status: 409 }
      );
    }

    const operator = await db.operator.create({
      data: {
        name: name.trim(),
        pin,
        taxNumber: taxNumber || tenant.taxNumber,
        role: role || "cashier",
        hourlyRate: typeof hourlyRate === "number" ? hourlyRate : 12,
        restaurantId: tenant.id,
      },
    });
    return NextResponse.json(
      {
        id: operator.id,
        name: operator.name,
        taxNumber: operator.taxNumber,
        role: operator.role,
        hourlyRate: operator.hourlyRate,
        active: operator.active,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/operators error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
