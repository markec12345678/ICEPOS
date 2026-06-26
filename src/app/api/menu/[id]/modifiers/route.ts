import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vrne modifierje za menijsko postavko
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const modifiers = await db.modifier.findMany({
      where: { menuItemId: id },
      orderBy: { label: "asc" },
    });
    return NextResponse.json(modifiers);
  } catch (e) {
    console.error("GET /api/menu/[id]/modifiers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// Doda modifier
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { label, priceDelta } = body as { label: string; priceDelta?: number };

    if (!label) {
      return NextResponse.json({ error: "Manjka label" }, { status: 400 });
    }

    const modifier = await db.modifier.create({
      data: {
        menuItemId: id,
        label: label.trim(),
        priceDelta: priceDelta || 0,
      },
    });
    return NextResponse.json(modifier, { status: 201 });
  } catch (e) {
    console.error("POST /api/menu/[id]/modifiers error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
