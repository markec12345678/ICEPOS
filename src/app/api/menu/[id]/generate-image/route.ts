import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// POST /api/menu/[id]/generate-image — generiraj AI sliko za meni postavko
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
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko generira slike" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const menuItem = await db.menuItem.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Meni postavka ni najdena" }, { status: 404 });
    }

    // Build prompt za AI
    const prompt = buildFoodImagePrompt(menuItem.name, menuItem.desc || "", menuItem.category);

    // Generiraj sliko z ZAI
    const zai = await ZAI.create();
    const response = await zai.images.generations.create({
      prompt,
      size: "1024x1024", // kvadratna — idealno za meni kartice
    });

    if (!response.data || !response.data[0] || !response.data[0].base64) {
      throw new Error("Napaka pri generiranju slike");
    }

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, "base64");

    // Shrani sliko v public/images/menu/
    const imagesDir = path.join(process.cwd(), "public", "images", "menu");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const filename = `${id}.png`;
    const filepath = path.join(imagesDir, filename);
    fs.writeFileSync(filepath, buffer);

    // Posodobi MenuItem z imageUrl
    const imageUrl = `/images/menu/${filename}`;
    await db.menuItem.update({
      where: { id },
      data: { imageUrl },
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt,
      message: `Slika za "${menuItem.name}" uspešno generirana`,
    });
  } catch (e) {
    console.error("POST /api/menu/[id]/generate-image error:", e);
    return NextResponse.json(
      { error: "Napaka pri generiranju slike: " + (e as Error).message },
      { status: 500 }
    );
  }
}

// Build prompt za AI sliko hrane
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
