import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// POST /api/menu/generate-all-images — generiraj slike za VSE meni postavke brez slike
// Body: { limit?: number } (default 5 — da ne presežemo API omejitev)
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko generira slike" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 5, 10); // max 10 naenkrat

    // Pridobi vse meni postavke brez slike
    const items = await db.menuItem.findMany({
      where: { restaurantId: tenant.id, imageUrl: null },
      take: limit,
    });

    if (items.length === 0) {
      return NextResponse.json({
        generated: 0,
        message: "Vse meni postavke že imajo slike",
      });
    }

    // Pripravi direktorij
    const imagesDir = path.join(process.cwd(), "public", "images", "menu");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const zai = await ZAI.create();
    const results: { id: string; name: string; success: boolean; imageUrl?: string; error?: string }[] = [];

    for (const item of items) {
      try {
        const prompt = buildFoodImagePrompt(item.name, item.desc || "", item.category);
        const response = await zai.images.generations.create({
          prompt,
          size: "1024x1024",
        });

        if (!response.data || !response.data[0] || !response.data[0].base64) {
          throw new Error("No image data");
        }

        const buffer = Buffer.from(response.data[0].base64, "base64");
        const filename = `${item.id}.png`;
        fs.writeFileSync(path.join(imagesDir, filename), buffer);

        const imageUrl = `/images/menu/${filename}`;
        await db.menuItem.update({
          where: { id: item.id },
          data: { imageUrl },
        });

        results.push({ id: item.id, name: item.name, success: true, imageUrl });
      } catch (e) {
        results.push({
          id: item.id,
          name: item.name,
          success: false,
          error: (e as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      generated: successCount,
      total: items.length,
      results,
      message: `Generiranih ${successCount}/${items.length} slik`,
    });
  } catch (e) {
    console.error("POST /api/menu/generate-all-images error:", e);
    return NextResponse.json(
      { error: "Napaka pri generiranju slik: " + (e as Error).message },
      { status: 500 }
    );
  }
}

function buildFoodImagePrompt(name: string, desc: string, category: string): string {
  const style = "professional food photography, appetizing, top-down view, natural lighting, high quality, detailed, restaurant presentation, white plate";
  const categoryContext = {
    predjedi: "appetizer",
    glavne_jedi: "main course",
    sladice: "dessert",
    brezalkoholne: "non-alcoholic drink in glass",
    alkoholne: "alcoholic drink in glass",
  }[category] || "food";

  return `${name}, ${desc || categoryContext}, ${style}`;
}
