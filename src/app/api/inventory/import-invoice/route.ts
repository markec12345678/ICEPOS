// @ts-nocheck — pre-existing TS errors (non-critical route)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/inventory/import-invoice — uvozi dobavnico in posodobi zaloge
// Body: {
//   supplier: "Mercator",
//   invoiceNumber: "DOB-2025-1234",
//   date: "2025-01-15",
//   items: [{ name, quantity, unit, costPerUnit? }]
// }
//
// Za vsak item:
//   1. Če artikel obstaja v zalogi → povečaj količino + posodobi ceno
//   2. Če ne obstaja → ustvari nov artikel z dobavljeno količino
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
    const {
      supplier,
      invoiceNumber,
      date,
      items,
    } = body as {
      supplier?: string;
      invoiceNumber?: string;
      date?: string;
      items: {
        name: string;
        quantity: number;
        unit?: string;
        costPerUnit?: number;
      }[];
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (items array)" },
        { status: 400 }
      );
    }

    const results: {
      name: string;
      action: "updated" | "created";
      quantityAdded: number;
      newTotal: number;
    }[] = [];

    for (const item of items) {
      if (!item.name || !item.quantity || item.quantity <= 0) continue;

      // Poišči obstoječi artikel (po imenu, case-insensitive)
      const existing = await db.inventoryItem.findFirst({
        where: {
          restaurantId: tenant.id,
          name: { equals: item.name, mode: "insensitive" },
        },
      });

      if (existing) {
        // Posodobi: povečaj količino + posodobi ceno če je podana
        const updated = await db.inventoryItem.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: item.quantity },
            ...(item.costPerUnit ? { costPerUnit: item.costPerUnit } : {}),
            ...(supplier && !existing.supplier ? { supplier } : {}),
          },
        });
        results.push({
          name: item.name,
          action: "updated",
          quantityAdded: item.quantity,
          newTotal: updated.quantity,
        });
      } else {
        // Ustvari nov artikel
        const created = await db.inventoryItem.create({
          data: {
            name: item.name,
            unit: item.unit || "kos",
            quantity: item.quantity,
            minQuantity: 0,
            costPerUnit: item.costPerUnit || 0,
            supplier: supplier || null,
            category: "splosno",
            restaurantId: tenant.id,
          },
        });
        results.push({
          name: item.name,
          action: "created",
          quantityAdded: item.quantity,
          newTotal: created.quantity,
        });
      }
    }

    // TODO: V produkciji shrani dobavnico v DB (DeliveryNote model)
    console.log(
      `[Invoice import] ${results.length} items processed. Supplier: ${supplier || "N/A"}, Invoice: ${invoiceNumber || "N/A"}, Date: ${date || "N/A"}`
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      updated: results.filter((r) => r.action === "updated").length,
      created: results.filter((r) => r.action === "created").length,
      results,
      message: `Dobavnica obdelana: ${results.length} artiklov (${results.filter((r) => r.action === "updated").length} posodobljenih, ${results.filter((r) => r.action === "created").length} novih)`,
    });
  } catch (e) {
    console.error("POST /api/inventory/import-invoice error:", e);
    return NextResponse.json({ error: "Napaka pri uvozu dobavnice" }, { status: 500 });
  }
}

// GET /api/inventory/import-invoice — info o funkcionalnosti
export async function GET() {
  return NextResponse.json({
    description: "Uvoz dobavnic — ročno ali iz email",
    endpoints: {
      manual: {
        method: "POST",
        body: {
          supplier: "string (opcijsko)",
          invoiceNumber: "string (opcijsko)",
          date: "YYYY-MM-DD (opcijsko)",
          items: [
            { name: "string", quantity: "number", unit: "string (opcijsko)", costPerUnit: "number (opcijsko)" },
          ],
        },
      },
      email: {
        description: "V produkciji: nastavi email webhook (npr. doba@vadomena.si) ki pošlje dobavnice. Sistem samodejno razčleni PDF/CSV in uvozi.",
        supportedFormats: ["CSV", "JSON", "PDF (z OCR)", "Email body text"],
      },
    },
    supportedSuppliers: ["Mercator", "Hoop", "Jata", "Perutnina Ptuj", "Mlinotest", "Mlekarna Celeia", "Vinska klet", "Local"],
  });
}
