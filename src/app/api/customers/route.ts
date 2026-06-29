import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vse stranke, sortirane po totalSpent desc, z zadnjimi 10 naročili
export async function GET() {
  try {
    const customers = await db.customer.findMany({
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
    const body = await req.json();
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

    // Preveri unikatnost telefona, če je podan
    if (phone && phone.trim()) {
      const existing = await db.customer.findUnique({
        where: { phone: phone.trim() },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Stranka s to telefonsko številko že obstaja" },
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
      },
    });
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    console.error("POST /api/customers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
