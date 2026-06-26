import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne mize z njihovim aktivnim (odprtim) naročilom
export async function GET() {
  try {
    const tables = await db.table.findMany({
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: { status: "open" },
          include: { items: { include: { menuItem: true } } },
        },
      },
    });
    return NextResponse.json(tables);
  } catch (e) {
    console.error("GET /api/tables error:", e);
    return NextResponse.json(
      { error: "Napaka pri branju miz" },
      { status: 500 }
    );
  }
}
