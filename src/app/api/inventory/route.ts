import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Vsi inventarni izdelki, sortirani po imenu
export async function GET() {
  try {
    const items = await db.inventoryItem.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/inventory error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Nov inventarni izdelek (samo admin)
export async function POST(req: NextRequest) {
  try {
    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja zalogo" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      name,
      unit,
      quantity,
      minQuantity,
      costPerUnit,
      supplier,
      category,
    } = body as {
      name: string;
      unit?: string;
      quantity?: number;
      minQuantity?: number;
      costPerUnit?: number;
      supplier?: string;
      category?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (name)" },
        { status: 400 }
      );
    }

    const item = await db.inventoryItem.create({
      data: {
        name: name.trim(),
        unit: unit || "kos",
        quantity: typeof quantity === "number" ? quantity : 0,
        minQuantity: typeof minQuantity === "number" ? minQuantity : 0,
        costPerUnit: typeof costPerUnit === "number" ? costPerUnit : 0,
        supplier: supplier || null,
        category: category || "splosno",
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error("POST /api/inventory error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
