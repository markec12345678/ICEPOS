import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// POST /api/menu/translate-all — posodobi angleške prevode za vse meni postavke
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const items = await db.menuItem.findMany({
      where: { restaurantId: tenant.id },
    });

    // Slovensko → Angleško slovar
    const translations: Record<string, { nameEn: string; descEn: string }> = {
      "Pršut z melono": { nameEn: "Prosciutto with Melon", descEn: "Domestic prosciutto, fresh melon, arugula" },
      "Sirna deska": { nameEn: "Cheese Board", descEn: "Selection of Slovenian cheeses, walnuts, honey" },
      "Ocvrte bučke": { nameEn: "Fried Zucchini", descEn: "Breaded zucchini, garlic dip" },
      "Juha dneva": { nameEn: "Soup of the Day", descEn: "Beef soup with noodles" },
      "Oljke in sirek": { nameEn: "Olives and Cheese", descEn: "Mixed olives, feta cheese, tomato" },
      "Žlikrofi s pečenico": { nameEn: "Idrija Žlikrofi with Roast Pork", descEn: "Idrija dumplings, roast pork, sauce" },
      "Kranjska klobasa s kislim zeljem": { nameEn: "Carniolan Sausage with Sauerkraut", descEn: "Carniolan sausage, sauerkraut, potatoes" },
      "Jota": { nameEn: "Jota (Bean & Sauerkraut Soup)", descEn: "Traditional jota with beans and sauerkraut" },
      "Ajdovi žganci z ocvirki": { nameEn: "Buckwheat Žganci with Pork Cracklings", descEn: "Buckwheat porridge, cracklings, pork fat" },
      "Štruklji v skuti": { nameEn: "Štruklji in Cottage Cheese", descEn: "Rolled dumplings, cottage cheese, walnut sauce" },
      "Ocvrli piščanec": { nameEn: "Fried Chicken", descEn: "Crispy chicken, fries, salad" },
      "Šmarn golaž": { nameEn: "Wild Game Goulash", descEn: "Venison goulash, žlikrofi" },
      "Rižota z morskimi sadeži": { nameEn: "Seafood Risotto", descEn: "Calamari, shrimp, white wine" },
      "Biftek z gobovo omako": { nameEn: "Beef Steak with Mushroom Sauce", descEn: "Beef steak 200g, beef broth, fries" },
      "Prekmurska gibanica": { nameEn: "Prekmurje Layer Cake", descEn: "Traditional layer cake with cottage cheese, walnuts" },
      "Blediška kremšnita": { nameEn: "Bled Cream Cake", descEn: "Cream slice, puff pastry" },
      "Potica": { nameEn: "Walnut Potica", descEn: "Traditional walnut roll cake" },
      "Palačinke z nutello": { nameEn: "Pancakes with Nutella", descEn: "Nutella, banana, whipped cream" },
      "Domnči tiramisu": { nameEn: "Homemade Tiramisu", descEn: "Coffee, mascarpone, cocoa" },
      "Kava espresso": { nameEn: "Espresso", descEn: "Authentic Italian coffee" },
      "Cappuccino": { nameEn: "Cappuccino", descEn: "Espresso, steamed milk, foam" },
      "Topla čokolada": { nameEn: "Hot Chocolate", descEn: "Belgian chocolate, cream" },
      "Sok pomaranča": { nameEn: "Orange Juice", descEn: "Freshly squeezed orange juice" },
      "Radenska": { nameEn: "Radenska Mineral Water", descEn: "Mineral water 0.5l" },
      "Coca-Cola": { nameEn: "Coca-Cola", descEn: "0.33l" },
      "Čaj": { nameEn: "Tea", descEn: "Selection of teas, honey, lemon" },
      "Laški beli": { nameEn: "Laški White Wine", descEn: "0.2l, dry white wine" },
      "Refošk": { nameEn: "Refošk Red Wine", descEn: "0.2l, red wine from Primorska" },
      "Modra Frankinja": { nameEn: "Blaufränkisch Red Wine", descEn: "0.2l, red wine from Prekmurje" },
      "Pivo Laško": { nameEn: "Laško Beer", descEn: "0.5l, draft beer" },
      "Pivo Union": { nameEn: "Union Beer", descEn: "0.5l, draft beer" },
      "Aperol Spritz": { nameEn: "Aperol Spritz", descEn: "Aperol, prosecco, soda" },
      "Žganje slivovko": { nameEn: "Slivovitz (Plum Brandy)", descEn: "0.04l, homemade plum brandy" },
      "Žganje hruškovo": { nameEn: "Viljamovka (Pear Brandy)", descEn: "0.04l, William pear brandy" },
    };

    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const translation = translations[item.name];
      if (translation) {
        await db.menuItem.update({
          where: { id: item.id },
          data: {
            nameEn: translation.nameEn,
            descEn: translation.descEn,
          },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      updated,
      skipped,
      total: items.length,
      message: `Posodobljenih ${updated} angleških prevodov${skipped > 0 ? `, ${skipped} preskočenih` : ""}`,
    });
  } catch (e) {
    console.error("POST /api/menu/translate-all error:", e);
    return NextResponse.json({ error: "Napaka pri prevajanju" }, { status: 500 });
  }
}
