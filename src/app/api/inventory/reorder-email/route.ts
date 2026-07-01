import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// POST /api/inventory/reorder-email — pošlji naročilo dobavitelju na email
// Body: { supplier: "Mercator", email: "narocila@mercator.si", items: [{ name, quantity, unit }] }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();
    const { supplier, email, items } = body as {
      supplier: string;
      email: string;
      items: { name: string; quantity: number; unit: string }[];
    };

    if (!supplier || !email || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (supplier, email, items)" },
        { status: 400 }
      );
    }

    const itemsList = items
      .map((it, i) => `${i + 1}. ${it.name} — ${it.quantity} ${it.unit}`)
      .join("\n");

    const payload = {
      type: "order_confirmation" as const,
      to: email,
      customerName: tenant.name,
      subject: `Naročilo — ${tenant.name} → ${supplier}`,
      body: `Spoštovani,

${tenant.name} oddaja naslednje naročilo:

DOBAVITELJ: ${supplier}
DATUM NAROČILA: ${new Date().toLocaleDateString("sl-SI")}
RESTAVRACIJA: ${tenant.name}
${tenant.address || ""}

NAROČILO:
${itemsList}

Skupaj artiklov: ${items.length}

Prosimo za potrditev naročila in rok dobave.

Lep pozdrav,
${authOp.name}
${tenant.name}
${tenant.phone || ""}`,
    };

    const result = await sendNotification(payload, "email");

    return NextResponse.json({
      success: true,
      email,
      supplier,
      itemCount: items.length,
      message: `Naročilo poslano ${supplier} na ${email}`,
    });
  } catch (e) {
    console.error("POST /api/inventory/reorder-email error:", e);
    return NextResponse.json({ error: "Napaka pri pošiljanju email-a" }, { status: 500 });
  }
}
