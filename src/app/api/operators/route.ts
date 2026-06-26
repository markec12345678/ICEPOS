import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Vsi operaterji
export async function GET(req: NextRequest) {
  try {
    const operators = await db.operator.findMany({
      orderBy: { name: "asc" },
    });
    // Ne vrni PIN-a v odgovoru (varnost)
    return NextResponse.json(
      operators.map((o) => ({
        id: o.id,
        name: o.name,
        taxNumber: o.taxNumber,
        role: o.role,
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
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja operaterje" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, pin, taxNumber, role } = body as {
      name: string;
      pin: string;
      taxNumber?: string;
      role?: string;
    };

    if (!name || !pin || pin.length !== 4) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name, 4-mesten pin)" },
        { status: 400 }
      );
    }

    // Preveri unikatnost PIN-a
    const existing = await db.operator.findFirst({ where: { pin } });
    if (existing) {
      return NextResponse.json(
        { error: "PIN je že v uporabi" },
        { status: 409 }
      );
    }

    const operator = await db.operator.create({
      data: {
        name: name.trim(),
        pin,
        taxNumber: taxNumber || "SI12345678",
        role: role || "cashier",
      },
    });
    return NextResponse.json(
      {
        id: operator.id,
        name: operator.name,
        taxNumber: operator.taxNumber,
        role: operator.role,
        active: operator.active,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/operators error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
