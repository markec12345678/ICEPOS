import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { parseAllergens, ALLERGEN_KEYS, ALLERGEN_INFO } from "@/lib/allergens";

export const dynamic = "force-dynamic";

// GET /api/allergen-alerts — obvestila o alergenih za specifične stranke
// Najde stranke z alergijami in jedi, ki vsebujejo te alergene
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    // Pridobi vse stranke z alergijami
    const customers = await db.customer.findMany({
      where: {
        restaurantId: tenant.id,
        allergens: { not: null },
      },
      orderBy: { name: "asc" },
    });

    // Pridobi vse meni item-e z alergeni
    const menuItems = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Za vsako stranko preveri, katere jedi vsebujejo njene alergene
    const alerts = customers.map((customer) => {
      const customerAllergens = parseAllergens(customer.allergens);
      const dangerousItems = menuItems
        .filter((item) => {
          const itemAllergens = parseAllergens(item.allergens);
          return itemAllergens.some((a) => customerAllergens.includes(a));
        })
        .map((item) => {
          const itemAllergens = parseAllergens(item.allergens);
          const matchingAllergens = itemAllergens.filter((a) => customerAllergens.includes(a));
          return {
            menuItemId: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            available: item.available,
            matchingAllergens: matchingAllergens.map((a) => ({
              key: a,
              label: ALLERGEN_INFO[a]?.sl || a,
              icon: ALLERGEN_INFO[a]?.icon || "⚠",
            })),
            allAllergens: itemAllergens.map((a) => ALLERGEN_INFO[a]?.sl || a),
          };
        });

      const safeItems = menuItems.filter((item) => {
        const itemAllergens = parseAllergens(item.allergens);
        return !itemAllergens.some((a) => customerAllergens.includes(a)) && item.available;
      });

      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        allergens: customerAllergens.map((a) => ({
          key: a,
          label: ALLERGEN_INFO[a]?.sl || a,
          icon: ALLERGEN_INFO[a]?.icon || "⚠",
        })),
        dangerousItemsCount: dangerousItems.length,
        dangerousItems,
        safeItemsCount: safeItems.length,
        severity: dangerousItems.length > 10 ? "high" : dangerousItems.length > 5 ? "medium" : "low",
      };
    });

    // Povzetek po alergenih
    const allergenSummary = ALLERGEN_KEYS.map((key) => {
      const affectedCustomers = customers.filter((c) =>
        parseAllergens(c.allergens).includes(key)
      ).length;
      const affectedItems = menuItems.filter((m) =>
        parseAllergens(m.allergens).includes(key)
      ).length;
      return {
        key,
        label: ALLERGEN_INFO[key].sl,
        icon: ALLERGEN_INFO[key].icon,
        affectedCustomers,
        affectedItems,
        riskLevel: affectedCustomers > 0 && affectedItems > 0 ? "high" : "low",
      };
    })
      .filter((a) => a.affectedCustomers > 0 || a.affectedItems > 0)
      .sort((a, b) => b.affectedCustomers - a.affectedCustomers);

    const summary = {
      totalCustomersWithAllergies: customers.length,
      totalCustomers: (await db.customer.count({ where: { restaurantId: tenant.id } })),
      totalAlerts: alerts.reduce((s, a) => s + a.dangerousItemsCount, 0),
      highRiskCustomers: alerts.filter((a) => a.severity === "high").length,
      mediumRiskCustomers: alerts.filter((a) => a.severity === "medium").length,
      lowRiskCustomers: alerts.filter((a) => a.severity === "low").length,
      totalDangerousItems: alerts.reduce((s, a) => s + a.dangerousItemsCount, 0),
      avgDangerousPerCustomer: customers.length > 0
        ? alerts.reduce((s, a) => s + a.dangerousItemsCount, 0) / customers.length
        : 0,
    };

    return NextResponse.json({
      alerts,
      allergenSummary,
      summary,
    });
  } catch (e) {
    console.error("GET /api/allergen-alerts error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju obvestil o alergenih" }, { status: 500 });
  }
}
