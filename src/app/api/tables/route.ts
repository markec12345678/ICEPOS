import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne mize z njihovim aktivnim (odprtim) naročilom + današnjimi rezervacijami
export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const tables = await db.table.findMany({
      orderBy: { number: "asc" },
      include: {
        orders: {
          where: { status: "open" },
          include: { items: { include: { menuItem: true } } },
        },
        reservations: {
          where: {
            date: today,
            status: { in: ["confirmed", "seated"] },
          },
          orderBy: { time: "asc" },
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
