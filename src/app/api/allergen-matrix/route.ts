import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { parseAllergens, ALLERGEN_KEYS, ALLERGEN_INFO } from "@/lib/allergens";

export const dynamic = "force-dynamic";

// GET /api/allergen-matrix — matrika alergenov za ves meni
// Vrne: postavke z alergeni, povzetek po alergenih, jedi brez alergenov
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Za vsako jed pripravi alergene
    const items = menuItems.map((item) => {
      const allergens = parseAllergens(item.allergens);
      return {
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        category: item.category,
        price: item.price,
        available: item.available,
        allergens,
        allergenCount: allergens.length,
        allergenLabels: allergens.map((a) => ALLERGEN_INFO[a]?.sl || a),
        // Bool polja za vsak alergen (za matriko)
        allergenFlags: ALLERGEN_KEYS.reduce(
          (acc, key) => {
            acc[key] = allergens.includes(key);
            return acc;
          },
          {} as Record<string, boolean>
        ),
      };
    });

    // Povzetek: število jedi z vsakim alergenom
    const allergenSummary = ALLERGEN_KEYS.map((key) => {
      const count = items.filter((i) => i.allergenFlags[key]).length;
      return {
        key,
        label: ALLERGEN_INFO[key].sl,
        icon: ALLERGEN_INFO[key].icon,
        count,
        percentage: items.length > 0 ? (count / items.length) * 100 : 0,
      };
    }).sort((a, b) => b.count - a.count);

    // Jedi brez alergenov (varne za alergike)
    const allergenFree = items.filter((i) => i.allergenCount === 0);

    // Jedi z največ alergeni
    const mostAllergens = [...items]
      .filter((i) => i.allergenCount > 0)
      .sort((a, b) => b.allergenCount - a.allergenCount)
      .slice(0, 10);

    // Povzetek po kategorijah
    const categories = items.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = {
            category: item.category,
            total: 0,
            withAllergens: 0,
            allergenFree: 0,
          };
        }
        acc[item.category].total++;
        if (item.allergenCount > 0) {
          acc[item.category].withAllergens++;
        } else {
          acc[item.category].allergenFree++;
        }
        return acc;
      },
      {} as Record<string, { category: string; total: number; withAllergens: number; allergenFree: number }>
    );

    return NextResponse.json({
      items,
      allergenSummary,
      allergenFree,
      mostAllergens,
      categorySummary: Object.values(categories),
      summary: {
        totalItems: items.length,
        itemsWithAllergens: items.filter((i) => i.allergenCount > 0).length,
        itemsAllergenFree: allergenFree.length,
        uniqueAllergensUsed: allergenSummary.filter((a) => a.count > 0).length,
        topAllergen: allergenSummary[0] || null,
      },
    });
  } catch (e) {
    console.error("GET /api/allergen-matrix error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju matrike alergenov" }, { status: 500 });
  }
}
