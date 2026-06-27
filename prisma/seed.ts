import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const REDUCED = 0.095;
const STANDARD = 0.22;

const menuData = [
  // Predjedi
  { name: "Pršut z melono", category: "predjedi", price: 8.5, vatRate: REDUCED, desc: "Domači pršut, sveža melona, rukola" },
  { name: "Sirna deska", category: "predjedi", price: 7.9, vatRate: REDUCED, desc: "Izbor slovenskih sirjev, orehi, med" },
  { name: "Ocvrte bučke", category: "predjedi", price: 5.5, vatRate: REDUCED, desc: "Panirane bučke, česnov dip" },
  { name: "Juha dneva", category: "predjedi", price: 3.5, vatRate: REDUCED, desc: "Goveja juha z rezanci" },
  { name: "Oljke in sirek", category: "predjedi", price: 4.9, vatRate: REDUCED, desc: "Mešane oljke, sir feta, paradižnik" },

  // Glavne jedi
  { name: "Žlikrofi s pečenico", category: "glavne_jedi", price: 12.5, vatRate: REDUCED, desc: "Idrijski žlikrofi, pečenica, zaliv" },
  { name: "Kranjska klobasa s kislim zeljem", category: "glavne_jedi", price: 13.9, vatRate: REDUCED, desc: "Kranjska klobasa, zelje, krompir" },
  { name: "Jota", category: "glavne_jedi", price: 8.9, vatRate: REDUCED, desc: "Tradicionalna jota s fižolom in kislim zeljem" },
  { name: "Ajdovi žganci z ocvirki", category: "glavne_jedi", price: 7.9, vatRate: REDUCED, desc: "Ajdovi žganci, ocvirki, žganje" },
  { name: "Štruklji v skuti", category: "glavne_jedi", price: 8.5, vatRate: REDUCED, desc: "Zavitki v skuti, orehova omaka" },
  { name: "Ocvrli piščanec", category: "glavne_jedi", price: 11.5, vatRate: REDUCED, desc: "Hrustljavi piščanec, pomfrit, solata" },
  { name: "Šmarn golaž", category: "glavne_jedi", price: 10.9, vatRate: REDUCED, desc: "Golaž iz divjačine, žlikrofi" },
  { name: "Rižota z morskimi sadeži", category: "glavne_jedi", price: 14.5, vatRate: REDUCED, desc: "Kalamari, kozice, belo vino" },
  { name: "Biftek z gobovo omako", category: "glavne_jedi", price: 24.9, vatRate: REDUCED, desc: "Biftek 200g, goveja juha, pomfrit" },

  // Sladice
  { name: "Prekmurska gibanica", category: "sladice", price: 4.5, vatRate: REDUCED, desc: "Tradicionalna gibanica s skuto, orehi" },
  { name: "Blediška kremšnita", category: "sladice", price: 4.2, vatRate: REDUCED, desc: "Kremna rezina, listnato testo" },
  { name: "Potica", category: "sladice", price: 3.9, vatRate: REDUCED, desc: "Orehova potica" },
  { name: "Palačinke z nutello", category: "sladice", price: 4.5, vatRate: REDUCED, desc: "Nutella, banana, sladka smetana" },
  { name: "Domnči tiramisu", category: "sladice", price: 5.5, vatRate: REDUCED, desc: "Kava, mascarpone, kakao" },

  // Brezalkoholne
  { name: "Kava espresso", category: "brezalkoholne", price: 1.5, vatRate: REDUCED, desc: "Prava italijanska kava" },
  { name: "Cappuccino", category: "brezalkoholne", price: 2.0, vatRate: REDUCED, desc: "Espresso, topleno mleko, pena" },
  { name: "Topla čokolada", category: "brezalkoholne", price: 2.8, vatRate: REDUCED, desc: "Belgijska čokolada, smetana" },
  { name: "Sok pomaranča", category: "brezalkoholne", price: 2.5, vatRate: REDUCED, desc: "Sveže stisnjen pomarančni sok" },
  { name: "Radenska", category: "brezalkoholne", price: 2.3, vatRate: REDUCED, desc: "Mineralna voda 0,5l" },
  { name: "Coca-Cola", category: "brezalkoholne", price: 2.5, vatRate: REDUCED, desc: "0,33l" },
  { name: "Čaj", category: "brezalkoholne", price: 1.8, vatRate: REDUCED, desc: "Izbor čajev, med, limona" },

  // Alkoholne
  { name: "Laški beli", category: "alkoholne", price: 3.5, vatRate: STANDARD, desc: "0,2l, suho belo vino" },
  { name: "Refošk", category: "alkoholne", price: 3.8, vatRate: STANDARD, desc: "0,2l, rdeče vino Primorska" },
  { name: "Modra Frankinja", category: "alkoholne", price: 3.8, vatRate: STANDARD, desc: "0,2l, rdeče vino Prekmurje" },
  { name: "Pivo Laško", category: "alkoholne", price: 2.8, vatRate: STANDARD, desc: "0,5l, točeno" },
  { name: "Pivo Union", category: "alkoholne", price: 2.8, vatRate: STANDARD, desc: "0,5l, točeno" },
  { name: "Aperol Spritz", category: "alkoholne", price: 5.5, vatRate: STANDARD, desc: "Aperol, prosecco, soda" },
  { name: "Žganje slivovko", category: "alkoholne", price: 3.0, vatRate: STANDARD, desc: "0,04l, domača šljivovka" },
  { name: "Žganje hruškovo", category: "alkoholne", price: 3.2, vatRate: STANDARD, desc: "0,04l, viljamovka" },
];

const tablesData = [
  // Dvorana
  { number: 1, name: "Miza 1", seats: 2, section: "Dvorana" },
  { number: 2, name: "Miza 2", seats: 4, section: "Dvorana" },
  { number: 3, name: "Miza 3", seats: 4, section: "Dvorana" },
  { number: 4, name: "Miza 4", seats: 6, section: "Dvorana" },
  { number: 5, name: "Miza 5", seats: 4, section: "Dvorana" },
  { number: 6, name: "Miza 6", seats: 8, section: "Dvorana" },
  { number: 7, name: "Miza 7", seats: 2, section: "Dvorana" },
  { number: 8, name: "Miza 8", seats: 4, section: "Dvorana" },
  // Terasa
  { number: 9, name: "Terasa 1", seats: 4, section: "Terasa" },
  { number: 10, name: "Terasa 2", seats: 4, section: "Terasa" },
  { number: 11, name: "Terasa 3", seats: 6, section: "Terasa" },
  { number: 12, name: "Terasa 4", seats: 2, section: "Terasa" },
  // Zasebna
  { number: 13, name: "Zasebna 1", seats: 10, section: "Zasebna" },
  { number: 14, name: "Zasebna 2", seats: 12, section: "Zasebna" },
];

async function main() {
  console.log("🌱 Seeding slovenskega menija in miz...");

  // Počisti (vrstni red pomemben zaradi foreign key constraints)
  await db.modifier.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.reservation.deleteMany();
  await db.shift.deleteMany();
  await db.operator.deleteMany();
  await db.menuItem.deleteMany();
  await db.table.deleteMany();

  // Mize
  for (const t of tablesData) {
    await db.table.create({ data: t });
  }
  console.log(`✅ ${tablesData.length} miz ustvarjenih`);

  // Meni
  for (const m of menuData) {
    await db.menuItem.create({ data: { ...m, available: true } });
  }
  console.log(`✅ ${menuData.length} menijskih postavk ustvarjenih`);

  // Dodaj alergene + angleške prevode
  await seedAllergensAndTranslations(db);

  // Demo: eno odprto naročilo na mizi 2
  const table2 = await db.table.findFirst({ where: { number: 2 } });
  const zlikrofi = await db.menuItem.findFirst({ where: { name: "Žlikrofi s pečenico" } });
  const refošk = await db.menuItem.findFirst({ where: { name: "Refošk" } });
  const gibanica = await db.menuItem.findFirst({ where: { name: "Prekmurska gibanica" } });

  if (table2 && zlikrofi && refošk && gibanica) {
    const order = await db.order.create({
      data: {
        tableId: table2.id,
        status: "open",
        operator: "Ana",
      },
    });
    await db.orderItem.createMany({
      data: [
        { orderId: order.id, menuItemId: zlikrofi.id, quantity: 2, unitPrice: zlikrofi.price, vatRate: zlikrofi.vatRate },
        { orderId: order.id, menuItemId: refošk.id, quantity: 2, unitPrice: refošk.price, vatRate: refošk.vatRate },
        { orderId: order.id, menuItemId: gibanica.id, quantity: 1, unitPrice: gibanica.price, vatRate: gibanica.vatRate },
      ],
    });
    // Posodobi skupaj
    const total = 2 * zlikrofi.price + 2 * refošk.price + 1 * gibanica.price;
    const vatTotal = 2 * zlikrofi.price * zlikrofi.vatRate + 2 * refošk.price * refošk.vatRate + 1 * gibanica.price * gibanica.vatRate;
    await db.order.update({ where: { id: order.id }, data: { total, vatTotal } });
    console.log("✅ Demo naročilo na mizi 2 ustvarjeno");
  }

  // Demo: nekaj plačanih računov iz današnjega dne (za dnevnik + statistiko)
  await seedPaidReceipts(db);

  // Demo: modifierji za nekaj jedi
  await seedModifiers(db);

  // Demo: označi priljubljene in dnevno ponudbo
  await seedFavoritesAndSpecials(db);

  // Demo: rezervacije za danes in jutri
  await seedReservations(db);

  // Demo: ena zaprta smena včerajšnji dan
  await seedShifts(db);

  // Demo: operaterji s PIN-i
  await seedOperators(db);

  console.log("🎉 Seed končan!");
}

async function seedAllergensAndTranslations(db: import("@prisma/client").PrismaClient) {
  // Alergeni (EU 1169/2011) + angleški prevodi za slovenske jedi
  const translations: Record<string, { nameEn: string; descEn?: string; allergens: string[] }> = {
    "Pršut z melono": { nameEn: "Prosciutto with melon", descEn: "Dried ham, fresh melon, arugula", allergens: ["milk"] },
    "Sirna deska": { nameEn: "Cheese platter", descEn: "Selection of Slovenian cheeses, walnuts, honey", allergens: ["milk", "nuts"] },
    "Ocvrte bučke": { nameEn: "Fried zucchini", descEn: "Breaded zucchini, garlic dip", allergens: ["gluten", "milk", "eggs"] },
    "Juha dneva": { nameEn: "Soup of the day", descEn: "Beef soup with noodles", allergens: ["gluten", "eggs", "celery"] },
    "Oljke in sirek": { nameEn: "Olives and feta", descEn: "Mixed olives, feta cheese, tomato", allergens: ["milk"] },
    "Žlikrofi s pečenico": { nameEn: "Idrija dumplings with pork", descEn: "Traditional stuffed dumplings, roast pork, gravy", allergens: ["gluten", "eggs", "celery"] },
    "Kranjska klobasa s kislim zeljem": { nameEn: "Carniolan sausage with sauerkraut", descEn: "Kranjska sausage, sauerkraut, potatoes", allergens: ["sulfites", "mustard"] },
    "Jota": { nameEn: "Jota (bean and sauerkraut stew)", descEn: "Traditional stew with beans and sauerkraut", allergens: ["sulfites", "celery"] },
    "Ajdovi žganci z ocvirki": { nameEn: "Buckwheat mush with cracklings", descEn: "Buckwheat dumplings, pork cracklings", allergens: ["sulfites"] },
    "Štruklji v skuti": { nameEn: "Cheese dumplings", descEn: "Rolled dumplings in cottage cheese, walnut sauce", allergens: ["gluten", "milk", "eggs", "nuts"] },
    "Ocvrli piščanec": { nameEn: "Fried chicken", descEn: "Crispy fried chicken, french fries, salad", allergens: ["gluten", "eggs"] },
    "Šmarn golaž": { nameEn: "Venison goulash", descEn: "Wild game goulash, dumplings", allergens: ["gluten", "celery"] },
    "Rižota z morskimi sadeži": { nameEn: "Seafood risotto", descEn: "Calamari, shrimp, white wine", allergens: ["shellfish", "molluscs", "milk", "sulfites"] },
    "Biftek z gobovo omako": { nameEn: "Beefsteak with mushroom sauce", descEn: "Beef 200g, beef broth, french fries", allergens: ["milk", "celery", "sulfites"] },
    "Prekmurska gibanica": { nameEn: "Prekmurje layer cake", descEn: "Traditional cake with cottage cheese, walnuts", allergens: ["gluten", "milk", "eggs", "nuts"] },
    "Blediška kremšnita": { nameEn: "Bled cream cake", descEn: "Cream slice, puff pastry", allergens: ["gluten", "milk", "eggs"] },
    "Potica": { nameEn: "Walnut roll", descEn: "Traditional Slovenian walnut potica", allergens: ["gluten", "milk", "eggs", "nuts"] },
    "Palačinke z nutello": { nameEn: "Pancakes with Nutella", descEn: "Nutella, banana, whipped cream", allergens: ["gluten", "milk", "eggs", "nuts", "soy"] },
    "Domnči tiramisu": { nameEn: "Homemade tiramisu", descEn: "Coffee, mascarpone, cocoa", allergens: ["gluten", "milk", "eggs"] },
    "Kava espresso": { nameEn: "Espresso", allergens: [] },
    "Cappuccino": { nameEn: "Cappuccino", allergens: ["milk"] },
    "Topla čokolada": { nameEn: "Hot chocolate", descEn: "Belgian chocolate, cream", allergens: ["milk"] },
    "Sok pomaranča": { nameEn: "Orange juice", descEn: "Freshly squeezed orange juice", allergens: [] },
    "Radenska": { nameEn: "Radenska mineral water", descEn: "Mineral water 0.5l", allergens: [] },
    "Coca-Cola": { nameEn: "Coca-Cola", descEn: "0.33l", allergens: [] },
    "Čaj": { nameEn: "Tea", descEn: "Selection of teas, honey, lemon", allergens: [] },
    "Laški beli": { nameEn: "White wine (Laški)", descEn: "0.2l, dry white wine", allergens: ["sulfites"] },
    "Refošk": { nameEn: "Refosco red wine", descEn: "0.2l, red wine from Primorska", allergens: ["sulfites"] },
    "Modra Frankinja": { nameEn: "Blaufränkisch red wine", descEn: "0.2l, red wine from Prekmurje", allergens: ["sulfites"] },
    "Pivo Laško": { nameEn: "Laško beer", descEn: "0.5l, draft", allergens: ["gluten"] },
    "Pivo Union": { nameEn: "Union beer", descEn: "0.5l, draft", allergens: ["gluten"] },
    "Aperol Spritz": { nameEn: "Aperol Spritz", descEn: "Aperol, prosecco, soda", allergens: ["sulfites"] },
    "Žganje slivovko": { nameEn: "Plum brandy (Slivovka)", descEn: "0.04l, homemade plum brandy", allergens: [] },
    "Žganje hruškovo": { nameEn: "Pear brandy (Viljamovka)", descEn: "0.04l, William pear brandy", allergens: [] },
  };

  let count = 0;
  for (const [name, data] of Object.entries(translations)) {
    const item = await db.menuItem.findFirst({ where: { name } });
    if (item) {
      await db.menuItem.update({
        where: { id: item.id },
        data: {
          nameEn: data.nameEn,
          descEn: data.descEn || null,
          allergens: data.allergens.length > 0 ? JSON.stringify(data.allergens) : null,
        },
      });
      count++;
    }
  }
  console.log(`✅ ${count} postavk posodobljenih z alergeni + EN prevodi`);
}

async function seedFavoritesAndSpecials(db: import("@prisma/client").PrismaClient) {
  // Priljubljene (najpogosteje naročene)
  const favorites = ["Kranjska klobasa s kislim zeljem", "Žlikrofi s pečenico", "Biftek z gobovo omako", "Pivo Laško", "Cappuccino", "Aperol Spritz"];
  // Dnevna ponudba (menu dneva)
  const specials = ["Jota", "Šmarn golaž", "Prekmurska gibanica"];

  for (const name of favorites) {
    await db.menuItem.updateMany({
      where: { name },
      data: { isFavorite: true },
    });
  }
  for (const name of specials) {
    await db.menuItem.updateMany({
      where: { name },
      data: { isDailySpecial: true },
    });
  }
  console.log(`✅ ${favorites.length} priljubljenih + ${specials.length} dnevnih ponudb označenih`);
}

async function seedOperators(db: import("@prisma/client").PrismaClient) {
  const operators = [
    { name: "Ana", pin: "1234", taxNumber: "SI12345678", role: "cashier" },
    { name: "Marko", pin: "5678", taxNumber: "SI87654321", role: "cashier" },
    { name: "Admin", pin: "9999", taxNumber: "SI11111111", role: "admin" },
  ];

  for (const op of operators) {
    await db.operator.create({ data: op });
  }
  console.log(`✅ ${operators.length} operaterjev ustvarjenih (PIN: 1234, 5678, 9999)`);
}

async function seedModifiers(db: import("@prisma/client").PrismaClient) {
  const biftek = await db.menuItem.findFirst({ where: { name: "Biftek z gobovo omako" } });
  const zlikrofi = await db.menuItem.findFirst({ where: { name: "Žlikrofi s pečenico" } });
  const pivo = await db.menuItem.findFirst({ where: { name: "Pivo Laško" } });

  const mods = [
    biftek && { menuItemId: biftek.id, label: "Dobra pečena", priceDelta: 0 },
    biftek && { menuItemId: biftek.id, label: "Medium", priceDelta: 0 },
    biftek && { menuItemId: biftek.id, label: "Srednje pečena", priceDelta: 0 },
    biftek && { menuItemId: biftek.id, label: "Gobe dodaj", priceDelta: 2.5 },
    zlikrofi && { menuItemId: zlikrofi.id, label: "Brez zaliva", priceDelta: 0 },
    zlikrofi && { menuItemId: zlikrofi.id, label: "Dvojna porcija", priceDelta: 6.0 },
    zlikrofi && { menuItemId: zlikrofi.id, label: "Brez čebule", priceDelta: 0 },
    pivo && { menuItemId: pivo.id, label: "Veliko (0,5l)", priceDelta: 0.8 },
    pivo && { menuItemId: pivo.id, label: "Hladno", priceDelta: 0 },
  ].filter(Boolean) as { menuItemId: string; label: string; priceDelta: number }[];

  for (const m of mods) {
    await db.modifier.create({ data: m });
  }
  console.log(`✅ ${mods.length} modifierjev ustvarjenih`);
}

async function seedReservations(db: import("@prisma/client").PrismaClient) {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const table3 = await db.table.findFirst({ where: { number: 3 } });
  const table6 = await db.table.findFirst({ where: { number: 6 } });
  const table9 = await db.table.findFirst({ where: { number: 9 } });
  const table11 = await db.table.findFirst({ where: { number: 11 } });

  const reservations = [
    { tableId: table3?.id, customerName: "Janez Novak", customerPhone: "031 234 567", partySize: 4, date: today, time: "19:00", duration: 120, note: "Alergija na gluten" },
    { tableId: table6?.id, customerName: "Familija Horvat", customerPhone: "041 555 333", partySize: 6, date: today, time: "20:00", duration: 150, note: "Rojstni dan — torta v hladilniku" },
    { tableId: table9?.id, customerName: "Gospod Kovač", customerPhone: null, partySize: 2, date: today, time: "12:30", duration: 90, note: null },
    { tableId: table11?.id, customerName: "Skupina 8 oseb", customerPhone: "051 999 888", partySize: 8, date: tomorrow, time: "19:30", duration: 180, note: "Poslovno srečanje" },
  ].filter((r) => r.tableId) as { tableId: string; customerName: string; customerPhone: string | null; partySize: number; date: string; time: string; duration: number; note: string | null }[];

  for (const r of reservations) {
    await db.reservation.create({
      data: { ...r, status: "confirmed" },
    });
  }
  console.log(`✅ ${reservations.length} rezervacij ustvarjenih`);
}

async function seedShifts(db: import("@prisma/client").PrismaClient) {
  // Včerajšnja zaprta smena (Ana)
  const yesterday = new Date(Date.now() - 86400000);
  const start = new Date(yesterday);
  start.setHours(10, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(22, 0, 0, 0);

  await db.shift.create({
    data: {
      operator: "Ana",
      operatorTaxNo: "SI12345678",
      startTime: start,
      endTime: end,
      startCash: 150,
      endCash: 420,
      status: "closed",
      ordersCount: 8,
      totalRevenue: 234.5,
      note: "Mirna smena, vse OK",
    },
  });

  // Predvčerajšnja zaprta smena (Marko)
  const dayBefore = new Date(Date.now() - 2 * 86400000);
  const start2 = new Date(dayBefore);
  start2.setHours(14, 0, 0, 0);
  const end2 = new Date(dayBefore);
  end2.setHours(23, 0, 0, 0);

  await db.shift.create({
    data: {
      operator: "Marko",
      operatorTaxNo: "SI87654321",
      startTime: start2,
      endTime: end2,
      startCash: 200,
      endCash: 380,
      status: "closed",
      ordersCount: 5,
      totalRevenue: 178.3,
      note: null,
    },
  });

  console.log("✅ 2 zaprti smeni ustvarjeni");
}

async function seedPaidReceipts(db: import("@prisma/client").PrismaClient) {
  // Poenostavljen FURS-like podpis (demo, brez pravega RSA)
  function fakeZoi(n: number) {
    return Array.from({ length: 32 }, (_, i) =>
      ((n + i * 7) % 16).toString(16).toUpperCase()
    ).join("");
  }
  function fakeEor(n: number) {
    return Array.from({ length: 32 }, (_, i) =>
      ((n * 3 + i * 11) % 16).toString(16).toUpperCase()
    ).join("");
  }

  const jota = await db.menuItem.findFirst({ where: { name: "Jota" } });
  const kranjska = await db.menuItem.findFirst({ where: { name: "Kranjska klobasa s kislim zeljem" } });
  const pivo = await db.menuItem.findFirst({ where: { name: "Pivo Laško" } });
  const cappuccino = await db.menuItem.findFirst({ where: { name: "Cappuccino" } });
  const potica = await db.menuItem.findFirst({ where: { name: "Potica" } });
  const spritz = await db.menuItem.findFirst({ where: { name: "Aperol Spritz" } });
  const biftek = await db.menuItem.findFirst({ where: { name: "Biftek z gobovo omako" } });
  const gibanicaLocal = await db.menuItem.findFirst({ where: { name: "Prekmurska gibanica" } });
  const refoškLocal = await db.menuItem.findFirst({ where: { name: "Refošk" } });
  const table3 = await db.table.findFirst({ where: { number: 3 } });
  const table5 = await db.table.findFirst({ where: { number: 5 } });
  const table7 = await db.table.findFirst({ where: { number: 7 } });
  const table9 = await db.table.findFirst({ where: { number: 9 } });
  const table10 = await db.table.findFirst({ where: { number: 10 } });

  const demoReceipts = [
    { hoursAgo: 5, table: table3, items: [{ m: jota, q: 2 }, { m: pivo, q: 2 }, { m: potica, q: 1 }], method: "cash", operator: "Ana" },
    { hoursAgo: 4, table: table5, items: [{ m: kranjska, q: 1 }, { m: pivo, q: 1 }, { m: potica, q: 1 }], method: "card", operator: "Ana" },
    { hoursAgo: 3, table: table7, items: [{ m: cappuccino, q: 2 }, { m: gibanicaLocal, q: 1 }], method: "cash", operator: "Marko" },
    { hoursAgo: 2, table: table9, items: [{ m: spritz, q: 3 }], method: "card", operator: "Marko" },
    { hoursAgo: 1, table: table10, items: [{ m: biftek, q: 2 }, { m: refoškLocal, q: 2 }, { m: gibanicaLocal, q: 2 }], method: "card", operator: "Ana" },
  ];

  let seq = 1;
  for (const r of demoReceipts) {
    if (!r.table) continue;
    const paidAt = new Date();
    paidAt.setHours(paidAt.getHours() - r.hoursAgo);

    const items = r.items.filter((i) => i.m);
    if (items.length === 0) continue;
    const total = items.reduce((s, i) => s + i.m!.price * i.q, 0);
    const vatTotal = items.reduce(
      (s, i) => s + i.m!.price * i.q * i.m!.vatRate,
      0
    );

    const invNum = `PREVOZ11-BLAG01-${String(seq).padStart(10, "0")}`;
    const order = await db.order.create({
      data: {
        tableId: r.table.id,
        status: "paid",
        total,
        vatTotal,
        paidAt,
        paymentMethod: r.method,
        receiptNo: invNum,
        invoiceNumber: invNum,
        zoi: fakeZoi(seq),
        eor: fakeEor(seq),
        fursXml: `<demo/>`,
        operator: r.operator,
        businessUnit: "PREVOZ11",
        cashRegister: "BLAG01",
      },
    });
    await db.orderItem.createMany({
      data: items.map((i) => ({
        orderId: order.id,
        menuItemId: i.m!.id,
        quantity: i.q,
        unitPrice: i.m!.price,
        vatRate: i.m!.vatRate,
      })),
    });
    seq++;
  }
  console.log(`✅ ${seq - 1} plačanih demo računov ustvarjenih`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
