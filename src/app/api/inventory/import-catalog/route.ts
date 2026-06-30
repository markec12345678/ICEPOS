import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";
import { FOOD_CATALOG } from "@/lib/food-catalog";

export const dynamic = "force-dynamic";

// GET /api/inventory/import-catalog — vrne katalog (za UI prikaz)
export async function GET(req: NextRequest) {
  return NextResponse.json({
    items: FOOD_CATALOG,
    categories: CATALOG_CATEGORIES_EXPORT,
    total: FOOD_CATALOG.length,
  });
}

const CATALOG_CATEGORIES_EXPORT = [
  { id: "meso", label: "Meso in mesnine", icon: "🥩" },
  { id: "ribe", label: "Ribe in morski sadeži", icon: "🐟" },
  { id: "zelenjava", label: "Zelenjava", icon: "🥕" },
  { id: "sadje", label: "Sadje", icon: "🍎" },
  { id: "mlecni", label: "Mlečni izdelki", icon: "🥛" },
  { id: "zita", label: "Žita in moke", icon: "🌾" },
  { id: "olja", label: "Olja in maščobe", icon: "🫒" },
  { id: "zacimbe", label: "Začimbe in sol", icon: "🧂" },
  { id: "sladkor", label: "Sladkor in sladila", icon: "🍯" },
  { id: "kava", label: "Kava in čaj", icon: "☕" },
  { id: "pijaca", label: "Brezalkoholne pijače", icon: "🥤" },
  { id: "alkohol", label: "Alkoholne pijače", icon: "🍷" },
  { id: "omake", label: "Omake in dodatki", icon: "🥫" },
  { id: "konzerve", label: "Konzervirana živila", icon: "🥫" },
  { id: "osnove", label: "Osnovna živila", icon: "📦" },
  { id: "embalaza", label: "Embalaža", icon: "📦" },
];

// POST /api/inventory/import-catalog — uvozi izbrane artikle iz kataloga
// Body: { items: [{ name, unit, category, minQuantity, costPerUnit, supplier }] }
// ali { all: true, category?: "meso" } za uvoz cele kategorije
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json({ error: "Potrebna prijava" }, { status: 401 });
    }

    const body = await req.json();

    let itemsToImport: typeof FOOD_CATALOG = [];

    if (body.all) {
      // Uvozi vse ali določeno kategorijo
      itemsToImport = body.category
        ? FOOD_CATALOG.filter((i) => i.category === body.category)
        : FOOD_CATALOG;
    } else if (body.items && Array.isArray(body.items)) {
      // Uvozi izbrane artikle
      itemsToImport = body.items;
    } else {
      return NextResponse.json(
        { error: "Manjkajoči podatki (items ali all:true)" },
        { status: 400 }
      );
    }

    // Pridobi obstoječe item-e da ne duplikiramo
    const existing = await db.inventoryItem.findMany({
      where: { restaurantId: tenant.id },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

    const toCreate = itemsToImport.filter(
      (i) => !existingNames.has(i.name.toLowerCase())
    );

    if (toCreate.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: itemsToImport.length,
        message: "Vsi artikli že obstajajo v zalogi",
      });
    }

    // Kreiraj vse naenkrat
    await db.inventoryItem.createMany({
      data: toCreate.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: 0, // začetno stanje 0
        minQuantity: item.minQuantity,
        costPerUnit: item.costPerUnit,
        supplier: item.supplier,
        category: item.category,
        restaurantId: tenant.id,
      })),
    });

    return NextResponse.json({
      imported: toCreate.length,
      skipped: itemsToImport.length - toCreate.length,
      total: itemsToImport.length,
      message: `Uvoženih ${toCreate.length} artiklov (stanje 0)`,
    });
  } catch (e) {
    console.error("POST /api/inventory/import-catalog error:", e);
    return NextResponse.json({ error: "Napaka pri uvozu" }, { status: 500 });
  }
}
