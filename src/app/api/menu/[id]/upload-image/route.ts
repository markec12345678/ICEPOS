import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// POST /api/menu/[id]/upload-image — ročno naloži sliko za meni postavko
// Body: { base64: string } (base64 encoded image)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const { id } = await params;
    const menuItem = await db.menuItem.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Meni postavka ni najdena" }, { status: 404 });
    }

    const body = await req.json();
    const base64Data = body.base64 as string;

    if (!base64Data || !base64Data.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Manjkajoči ali napačen base64 podatek" },
        { status: 400 }
      );
    }

    // Odstrani data URL prefix
    const base64 = base64Data.split(",")[1];
    const buffer = Buffer.from(base64, "base64");

    // Shrani sliko
    const imagesDir = path.join(process.cwd(), "public", "images", "menu");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `${id}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), buffer);

    const imageUrl = `/images/menu/${filename}`;
    await db.menuItem.update({
      where: { id },
      data: { imageUrl },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      message: `Slika za "${menuItem.name}" uspešno naložena`,
    });
  } catch (e) {
    console.error("POST /api/menu/[id]/upload-image error:", e);
    return NextResponse.json({ error: "Napaka pri nalaganju slike" }, { status: 500 });
  }
}
