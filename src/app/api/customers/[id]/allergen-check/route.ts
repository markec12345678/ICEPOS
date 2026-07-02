import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/customers/[id]/allergen-check — preveri ali meni postavka vsebuje alergene stranke
// Body: { menuItemId: "xxx" }
// Vrne: { hasAllergen: true, allergens: ["gluten", "milk"], warning: "..." }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;
    const body = await req.json();
    const { menuItemId } = body as { menuItemId: string };

    if (!menuItemId) {
      return NextResponse.json({ error: "Manjka menuItemId" }, { status: 400 });
    }

    // Pridobi stranko
    const customer = await db.customer.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    // Pridobi meni postavko
    const menuItem = await db.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: tenant.id },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Meni postavka ni najdena" }, { status: 404 });
    }

    // Parse alergene stranke
    let customerAllergens: string[] = [];
    if (customer.allergens) {
      try {
        customerAllergens = JSON.parse(customer.allergens);
      } catch {
        // ignore
      }
    }

    if (customerAllergens.length === 0) {
      return NextResponse.json({
        hasAllergen: false,
        allergens: [],
        warning: null,
        message: "Stranka nima zabeleženih alergenov",
      });
    }

    // Parse alergene meni postavke
    let menuItemAllergens: string[] = [];
    if (menuItem.allergens) {
      try {
        menuItemAllergens = JSON.parse(menuItem.allergens);
      } catch {
        // ignore
      }
    }

    // Presek alergenov
    const matchingAllergens = customerAllergens.filter((a) =>
      menuItemAllergens.includes(a)
    );

    if (matchingAllergens.length === 0) {
      return NextResponse.json({
        hasAllergen: false,
        allergens: [],
        warning: null,
        message: "Varna za stranko",
      });
    }

    // ALERGEN_INFO iz menu-client.tsx
    const ALLERGEN_NAMES: Record<string, string> = {
      gluten: "Gluten",
      milk: "Mleko",
      eggs: "Jajca",
      nuts: "Oreški",
      soy: "Soja",
      fish: "Ribe",
      shellfish: "Rakovci",
      sesame: "Sezam",
      celery: "Zelena",
      mustard: "Gorčica",
      sulphites: "Sulfiti",
      lupin: "Volčji bob",
      peanuts: "Arašidi",
    };

    const allergenLabels = matchingAllergens.map(
      (a) => ALLERGEN_NAMES[a] || a
    );

    return NextResponse.json({
      hasAllergen: true,
      allergens: matchingAllergens,
      allergenLabels,
      warning: `⚠️ ${menuItem.name} vsebuje alergene na katere je ${customer.name} alergičen/a: ${allergenLabels.join(", ")}`,
      customerName: customer.name,
      itemName: menuItem.name,
    });
  } catch (e) {
    console.error("POST /api/customers/[id]/allergen-check error:", e);
    return NextResponse.json({ error: "Napaka pri preverjanju alergenov" }, { status: 500 });
  }
}
