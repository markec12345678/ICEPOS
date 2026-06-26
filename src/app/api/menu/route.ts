import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await db.menuItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/menu error:", e);
    return NextResponse.json(
      { error: "Napaka pri branju menija" },
      { status: 500 }
    );
  }
}
