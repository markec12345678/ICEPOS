import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/suppliers — vrne vse dobavitelje za restavracijo, urejene po imenu
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const suppliers = await db.supplier.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (e) {
    console.error("GET /api/suppliers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/suppliers — ustvari novega dobavitelja (samo admin)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja dobavitelje" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      contactPerson,
      phone,
      email,
      address,
      city,
      taxNumber,
      paymentTerms,
      discountPercent,
      note,
      active,
    } = body as {
      name: string;
      contactPerson?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      taxNumber?: string | null;
      paymentTerms?: string;
      discountPercent?: number;
      note?: string | null;
      active?: boolean;
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Ime dobavitelja je obvezno" },
        { status: 400 }
      );
    }

    const supplier = await db.supplier.create({
      data: {
        restaurantId: tenant.id,
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        taxNumber: taxNumber?.trim() || null,
        paymentTerms: paymentTerms || "30 dni",
        discountPercent: typeof discountPercent === "number" ? discountPercent : 0,
        note: note?.trim() || null,
        active: typeof active === "boolean" ? active : true,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (e) {
    console.error("POST /api/suppliers error:", e);
    return NextResponse.json({ error: "Napaka pri ustvarjanju dobavitelja" }, { status: 500 });
  }
}
