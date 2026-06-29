import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne izdelke z nizko zalogo (quantity <= minQuantity)
export async function GET() {
  try {
    // Prisma ne podpira neposredne primerjave dveh stolpcev v `where`,
    // zato pridobimo vse in filtriramo na aplikacijski ravni.
    const items = await db.inventoryItem.findMany({
      orderBy: { name: "asc" },
    });
    const lowStock = items.filter((it) => it.quantity <= it.minQuantity);
    return NextResponse.json(lowStock);
  } catch (e) {
    console.error("GET /api/inventory/low-stock error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
