import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// POST /api/menu/link-images — poveže obstoječe slike na disku z meni postavkami
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const imagesDir = path.join(process.cwd(), "public", "images", "menu");

    if (!fs.existsSync(imagesDir)) {
      return NextResponse.json({
        linked: 0,
        message: "Direktorij s slikami ne obstaja",
      });
    }

    // Pridobi vse datoteke v direktoriju
    const files = fs.readdirSync(imagesDir).filter((f) => f.endsWith(".png"));

    // Pridobi vse meni postavke
    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      select: { id: true, name: true, imageUrl: true },
    });

    let linked = 0;
    let skipped = 0;

    for (const file of files) {
      // ID je ime datoteke brez .png
      const itemId = file.replace(".png", "");
      const menuItem = menuItems.find((m) => m.id === itemId);

      if (menuItem && !menuItem.imageUrl) {
        await db.menuItem.update({
          where: { id: menuItem.id },
          data: { imageUrl: `/images/menu/${file}` },
        });
        linked++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      linked,
      skipped,
      totalFiles: files.length,
      message: `Povezanih ${linked} slik z meni postavkami${skipped > 0 ? `, ${skipped} preskočenih` : ""}`,
    });
  } catch (e) {
    console.error("POST /api/menu/link-images error:", e);
    return NextResponse.json({ error: "Napaka pri povezovanju slik" }, { status: 500 });
  }
}
