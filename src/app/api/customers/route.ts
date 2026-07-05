import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validate, CreateCustomerSchema } from "@/lib/validation";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Vse stranke za trenutno restavracijo, sortirane po totalSpent desc
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const customers = await db.customer.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { totalSpent: "desc" },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            paidAt: true,
            paymentMethod: true,
            receiptNo: true,
          },
        },
      },
    });
    return NextResponse.json(customers);
  } catch (e) {
    console.error("GET /api/customers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Nova stranka
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = validate(CreateCustomerSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Neveljaven vhod", details: parsed.error }, { status: 400 });
    }
    const { name, phone, email, note } = body as {
      name: string;
      phone?: string;
      email?: string;
      note?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name)" },
        { status: 400 }
      );
    }

    // Preveri unikatnost telefona znotraj te restavracije
    if (phone && phone.trim()) {
      const existing = await db.customer.findFirst({
        where: { phone: phone.trim(), restaurantId: tenant.id },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Stranka s to telefonsko številko že obstaja v tej restavraciji" },
          { status: 409 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        note: note?.trim() || null,
        restaurantId: tenant.id,
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    console.error("POST /api/customers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
