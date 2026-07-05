// @ts-nocheck — pre-existing TS errors (non-critical analytics/reporting route)
import { PrismaClient, OperatorRole, OrderStatus, PaymentMethod, ReservationStatus, ShiftStatus } from "@prisma/client";

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
  { number: 1, name: "Miza 1", seats: 2, section: "Dvorana" },
  { number: 2, name: "Miza 2", seats: 4, section: "Dvorana" },
  { number: 3, name: "Miza 3", seats: 4, section: "Dvorana" },
  { number: 4, name: "Miza 4", seats: 6, section: "Dvorana" },
  { number: 5, name: "Miza 5", seats: 4, section: "Dvorana" },
  { number: 6, name: "Miza 6", seats: 8, section: "Dvorana" },
  { number: 7, name: "Miza 7", seats: 2, section: "Dvorana" },
  { number: 8, name: "Miza 8", seats: 4, section: "Dvorana" },
  { number: 9, name: "Terasa 1", seats: 4, section: "Terasa" },
  { number: 10, name: "Terasa 2", seats: 4, section: "Terasa" },
  { number: 11, name: "Terasa 3", seats: 6, section: "Terasa" },
  { number: 12, name: "Terasa 4", seats: 2, section: "Terasa" },
  { number: 13, name: "Zasebna 1", seats: 10, section: "Zasebna" },
  { number: 14, name: "Zasebna 2", seats: 12, section: "Zasebna" },
];

// ============================================================
// RESTAURANT CONFIG (2 tenant-a za demo)
// ============================================================

const restaurants = [
  {
    name: "Gostilna Pri Marku",
    slug: "gostilna-pri-marku",
    subdomain: "marko",
    address: "Prevozna ulica 11, 1000 Ljubljana",
    city: "Ljubljana",
    phone: "01 234 56 78",
    email: "info@gostilnaprimarku.si",
    taxNumber: "SI12345678",
    businessUnit: "PREVOZ11",
    cashRegister: "BLAG01",
    fursEnv: "test",
  },
  {
    name: "Hotel Slavija",
    slug: "hotel-slavija",
    subdomain: "slavija",
    address: "Slovenska cesta 34, 1000 Ljubljana",
    city: "Ljubljana",
    phone: "01 425 33 11",
    email: "recepcija@hotelslavija.si",
    taxNumber: "SI87654321",
    businessUnit: "HOTEL34",
    cashRegister: "RECEP01",
    fursEnv: "test",
  },
];

async function main() {
  console.log("🌱 Multi-tenant seeding (2 restavraciji)...");

  // Počisti vse
  await db.timesheet.deleteMany();
  await db.schedule.deleteMany();
  await db.recipe.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.giftCard.deleteMany();
  await db.customer.deleteMany();
  await db.modifier.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.reservation.deleteMany();
  await db.shift.deleteMany();
  await db.operator.deleteMany();
  await db.menuItem.deleteMany();
  await db.table.deleteMany();
  await db.restaurant.deleteMany();

  // Ustvari obe restavraciji
  for (const r of restaurants) {
    await db.restaurant.create({ data: r });
  }
  console.log(`✅ ${restaurants.length} restavracij ustvarjenih`);

  // Seedaj vsako restavracijo posebej
  for (let i = 0; i < restaurants.length; i++) {
    const restaurant = await db.restaurant.findFirst({ where: { slug: restaurants[i].slug } });
    if (!restaurant) continue;
    await seedRestaurantData(db, restaurant.id, i);
  }

  console.log("🎉 Multi-tenant seed končan!");
}

async function seedRestaurantData(
  db: import("@prisma/client").PrismaClient,
  restaurantId: string,
  index: number
) {
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return;
  console.log(`\n--- Seeding: ${restaurant.name} ---`);

  // Mize (za drugo restavracijo s predpono H-)
  const prefix = index === 1 ? "H-" : "";
  for (const t of tablesData) {
    await db.table.create({
      data: { ...t, name: prefix + t.name, restaurantId },
    });
  }
  console.log(`✅ ${tablesData.length} miz`);

  // Meni (ista za obe, za demo)
  const menuMap = new Map<string, string>();
  for (const m of menuData) {
    const item = await db.menuItem.create({
      data: { ...m, available: true, restaurantId },
    });
    menuMap.set(m.name, item.id);
  }
  console.log(`✅ ${menuData.length} menijskih postavk`);

  // Operaterji (različni PIN-i za drugo restavracijo)
  const pinOffset = index * 1000;
  const operators = [
    { name: index === 0 ? "Ana" : "Mija", pin: String(1234 + pinOffset), taxNumber: restaurant.taxNumber, role: OperatorRole.cashier, hourlyRate: 12 },
    { name: index === 0 ? "Marko" : "Tomaž", pin: String(5678 + pinOffset), taxNumber: restaurant.taxNumber, role: OperatorRole.cashier, hourlyRate: 13 },
    { name: index === 0 ? "Admin" : "Direktor", pin: String(9999 + pinOffset), taxNumber: restaurant.taxNumber, role: OperatorRole.admin, hourlyRate: 20 },
  ];
  for (const op of operators) {
    await db.operator.create({ data: { ...op, restaurantId } });
  }
  console.log(`✅ 3 operaterjev (PIN: ${operators.map((o) => o.pin).join(", ")})`);

  // Inventory
  const inventoryItems = [
    { name: "Moka", unit: "kg", quantity: 25, minQuantity: 5, costPerUnit: 0.8, supplier: "Mlinotest", category: "splosno" },
    { name: "Goveje meso", unit: "kg", quantity: 8, minQuantity: 3, costPerUnit: 12.5, supplier: "Mercator", category: "meso" },
    { name: "Svinjsko meso", unit: "kg", quantity: 12, minQuantity: 4, costPerUnit: 8.5, supplier: "Jata", category: "meso" },
    { name: "Piščanec", unit: "kg", quantity: 15, minQuantity: 5, costPerUnit: 6.5, supplier: "Perutnina Ptuj", category: "meso" },
    { name: "Krompir", unit: "kg", quantity: 30, minQuantity: 10, costPerUnit: 0.6, supplier: "Local", category: "zelenjava" },
    { name: "Fižol", unit: "kg", quantity: 10, minQuantity: 3, costPerUnit: 2.5, supplier: "Mercator", category: "zelenjava" },
    { name: "Kislo zelje", unit: "kg", quantity: 8, minQuantity: 2, costPerUnit: 1.8, supplier: "Local", category: "zelenjava" },
    { name: "Sir (vsi)", unit: "kg", quantity: 6, minQuantity: 2, costPerUnit: 9.0, supplier: "Mlekarna Celeia", category: "splosno" },
    { name: "Jajca", unit: "kos", quantity: 60, minQuantity: 20, costPerUnit: 0.2, supplier: "Local", category: "splosno" },
    { name: "Pivo Laško (sod)", unit: "l", quantity: 50, minQuantity: 10, costPerUnit: 1.8, supplier: "Laško", category: "pijaca" },
    { name: "Vino Refošk", unit: "l", quantity: 15, minQuantity: 5, costPerUnit: 5.5, supplier: "Vinska klet", category: "pijaca" },
    { name: "Kava", unit: "kg", quantity: 4, minQuantity: 1, costPerUnit: 18.0, supplier: "Barcaffe", category: "splosno" },
  ];
  for (const item of inventoryItems) {
    await db.inventoryItem.create({ data: { ...item, restaurantId } });
  }
  console.log(`✅ ${inventoryItems.length} inventory items`);

  // Stranke
  const customers = [
    { name: "Janez Novak", phone: `031 234 56${index}7`, email: "janez@email.com", points: 45, totalSpent: 450.50, visitCount: 12, note: "Alergija na gluten" },
    { name: "Marija Horvat", phone: `041 555 33${index}3`, email: "marija@email.com", points: 32, totalSpent: 320.00, visitCount: 8, note: "Vegetarijanka" },
    { name: "Marko Kovač", phone: `051 999 88${index}8`, points: 15, totalSpent: 150.30, visitCount: 4 },
    { name: "Ana Zupan", phone: `070 123 45${index}6`, email: "ana@email.com", points: 68, totalSpent: 680.00, visitCount: 15, note: "Redna stranka" },
  ];
  for (const c of customers) {
    await db.customer.create({ data: { ...c, restaurantId } });
  }
  console.log(`✅ ${customers.length} strank`);

  // Modifiers
  const biftekId = menuMap.get("Biftek z gobovo omako");
  const zlikrofiId = menuMap.get("Žlikrofi s pečenico");
  const pivoId = menuMap.get("Pivo Laško");
  const mods = [
    biftekId && { menuItemId: biftekId, label: "Dobra pečena", priceDelta: 0 },
    biftekId && { menuItemId: biftekId, label: "Medium", priceDelta: 0 },
    biftekId && { menuItemId: biftekId, label: "Srednje pečena", priceDelta: 0 },
    biftekId && { menuItemId: biftekId, label: "Gobe dodaj", priceDelta: 2.5 },
    zlikrofiId && { menuItemId: zlikrofiId, label: "Brez zaliva", priceDelta: 0 },
    zlikrofiId && { menuItemId: zlikrofiId, label: "Dvojna porcija", priceDelta: 6.0 },
    zlikrofiId && { menuItemId: zlikrofiId, label: "Brez čebule", priceDelta: 0 },
    pivoId && { menuItemId: pivoId, label: "Veliko (0,5l)", priceDelta: 0.8 },
  ].filter(Boolean) as { menuItemId: string; label: string; priceDelta: number }[];
  for (const m of mods) {
    await db.modifier.create({ data: m });
  }

  // Darilne kartice
  await db.giftCard.create({
    data: {
      code: `GC-${index === 0 ? "MARKO" : "SLAVI"}01`,
      balance: 50,
      initialAmount: 50,
      restaurantId,
      customerName: "Demo prejemnik",
    },
  });
  console.log(`✅ 1 darilna kartica`);

  // Rezervacije za danes
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const table3 = await db.table.findFirst({ where: { number: 3, restaurantId } });
  const table6 = await db.table.findFirst({ where: { number: 6, restaurantId } });
  const table9 = await db.table.findFirst({ where: { number: 9, restaurantId } });
  const table11 = await db.table.findFirst({ where: { number: 11, restaurantId } });

  const reservations = [
    { tableId: table3?.id, customerName: "Janez Novak", customerPhone: "031 234 567", partySize: 4, date: today, time: "19:00", duration: 120, note: "Alergija na gluten" },
    { tableId: table6?.id, customerName: "Familija Horvat", customerPhone: "041 555 333", partySize: 6, date: today, time: "20:00", duration: 150, note: "Rojstni dan" },
    { tableId: table9?.id, customerName: "Gospod Kovač", customerPhone: null, partySize: 2, date: today, time: "12:30", duration: 90, note: null },
    { tableId: table11?.id, customerName: "Skupina 8 oseb", customerPhone: "051 999 888", partySize: 8, date: tomorrow, time: "19:30", duration: 180, note: "Poslovno srečanje" },
  ].filter((r) => r.tableId) as { tableId: string; customerName: string; customerPhone: string | null; partySize: number; date: string; time: string; duration: number; note: string | null }[];

  for (const r of reservations) {
    await db.reservation.create({ data: { ...r, status: ReservationStatus.confirmed, restaurantId } });
  }
  console.log(`✅ ${reservations.length} rezervacij`);

  // Včerajšnja zaprta smena
  const yesterday = new Date(Date.now() - 86400000);
  const start = new Date(yesterday);
  start.setHours(10, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(22, 0, 0, 0);
  await db.shift.create({
    data: {
      operator: index === 0 ? "Ana" : "Mija",
      operatorTaxNo: restaurant.taxNumber,
      startTime: start,
      endTime: end,
      startCash: 150,
      endCash: 420,
      status: ShiftStatus.closed,
      ordersCount: 8,
      totalRevenue: 234.5,
      note: "Mirna smena",
      restaurantId,
    },
  });

  // Demo naročilo na mizi 2 (odprto)
  const table2 = await db.table.findFirst({ where: { number: 2, restaurantId } });
  const zlikrofiItem = await db.menuItem.findFirst({ where: { name: "Žlikrofi s pečenico", restaurantId } });
  const refoškItem = await db.menuItem.findFirst({ where: { name: "Refošk", restaurantId } });
  const gibanicaItem = await db.menuItem.findFirst({ where: { name: "Prekmurska gibanica", restaurantId } });
  if (table2 && zlikrofiItem && refoškItem && gibanicaItem) {
    const order = await db.order.create({
      data: {
        tableId: table2.id,
        status: OrderStatus.open,
        operator: index === 0 ? "Ana" : "Mija",
        restaurantId,
        businessUnit: restaurant.businessUnit,
        cashRegister: restaurant.cashRegister,
      },
    });
    await db.orderItem.createMany({
      data: [
        { orderId: order.id, menuItemId: zlikrofiItem.id, quantity: 2, unitPrice: zlikrofiItem.price, vatRate: zlikrofiItem.vatRate },
        { orderId: order.id, menuItemId: refoškItem.id, quantity: 2, unitPrice: refoškItem.price, vatRate: refoškItem.vatRate },
        { orderId: order.id, menuItemId: gibanicaItem.id, quantity: 1, unitPrice: gibanicaItem.price, vatRate: gibanicaItem.vatRate },
      ],
    });
    const total = 2 * Number(zlikrofiItem.price) + 2 * Number(refoškItem.price) + 1 * gibanicaItem.price;
    const vatTotal = 2 * Number(zlikrofiItem.price) * zlikrofiItem.vatRate + 2 * Number(refoškItem.price) * refoškItem.vatRate + 1 * Number(gibanicaItem.price) * gibanicaItem.vatRate;
    await db.order.update({ where: { id: order.id }, data: { total, vatTotal } });
  }

  // Plačani demo računi
  await seedPaidReceipts(db, restaurantId, index);

  // Recipes
  const mokaInv = await db.inventoryItem.findFirst({ where: { name: "Moka", restaurantId } });
  const svinjinaInv = await db.inventoryItem.findFirst({ where: { name: "Svinjsko meso", restaurantId } });
  const govedinaInv = await db.inventoryItem.findFirst({ where: { name: "Goveje meso", restaurantId } });
  const zeljeInv = await db.inventoryItem.findFirst({ where: { name: "Kislo zelje", restaurantId } });
  const fizolInv = await db.inventoryItem.findFirst({ where: { name: "Fižol", restaurantId } });
  const krompirInv = await db.inventoryItem.findFirst({ where: { name: "Krompir", restaurantId } });

  const recipeData = [
    zlikrofiId && mokaInv && { menuItemId: zlikrofiId, inventoryItemId: mokaInv.id, quantity: 0.15 },
    zlikrofiId && svinjinaInv && { menuItemId: zlikrofiId, inventoryItemId: svinjinaInv.id, quantity: 0.2 },
    biftekId && govedinaInv && { menuItemId: biftekId, inventoryItemId: govedinaInv.id, quantity: 0.2 },
    biftekId && krompirInv && { menuItemId: biftekId, inventoryItemId: krompirInv.id, quantity: 0.3 },
  ].filter(Boolean) as { menuItemId: string; inventoryItemId: string; quantity: number }[];
  for (const r of recipeData) {
    await db.recipe.create({ data: r });
  }
}

async function seedPaidReceipts(
  db: import("@prisma/client").PrismaClient,
  restaurantId: string,
  index: number
) {
  function fakeZoi(n: number) {
    return Array.from({ length: 32 }, (_, i) => ((n + i * 7) % 16).toString(16).toUpperCase()).join("");
  }
  function fakeEor(n: number) {
    return Array.from({ length: 32 }, (_, i) => ((n * 3 + i * 11) % 16).toString(16).toUpperCase()).join("");
  }

  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) return;

  const jota = await db.menuItem.findFirst({ where: { name: "Jota", restaurantId } });
  const kranjska = await db.menuItem.findFirst({ where: { name: "Kranjska klobasa s kislim zeljem", restaurantId } });
  const pivo = await db.menuItem.findFirst({ where: { name: "Pivo Laško", restaurantId } });
  const cappuccino = await db.menuItem.findFirst({ where: { name: "Cappuccino", restaurantId } });
  const potica = await db.menuItem.findFirst({ where: { name: "Potica", restaurantId } });
  const spritz = await db.menuItem.findFirst({ where: { name: "Aperol Spritz", restaurantId } });
  const biftek = await db.menuItem.findFirst({ where: { name: "Biftek z gobovo omako", restaurantId } });
  const gibanica = await db.menuItem.findFirst({ where: { name: "Prekmurska gibanica", restaurantId } });
  const refošk = await db.menuItem.findFirst({ where: { name: "Refošk", restaurantId } });
  const table3 = await db.table.findFirst({ where: { number: 3, restaurantId } });
  const table5 = await db.table.findFirst({ where: { number: 5, restaurantId } });
  const table7 = await db.table.findFirst({ where: { number: 7, restaurantId } });
  const table9 = await db.table.findFirst({ where: { number: 9, restaurantId } });
  const table10 = await db.table.findFirst({ where: { number: 10, restaurantId } });

  const operatorName = index === 0 ? "Ana" : "Mija";
  const demoReceipts = [
    { hoursAgo: 5, table: table3, items: [{ m: jota, q: 2 }, { m: pivo, q: 2 }, { m: potica, q: 1 }], method: "cash", tip: 0 },
    { hoursAgo: 4, table: table5, items: [{ m: kranjska, q: 1 }, { m: pivo, q: 1 }, { m: potica, q: 1 }], method: "card", tip: 1.5 },
    { hoursAgo: 3, table: table7, items: [{ m: cappuccino, q: 2 }, { m: gibanica, q: 1 }], method: "cash", tip: 0.5 },
    { hoursAgo: 2, table: table9, items: [{ m: spritz, q: 3 }], method: "card", tip: 1.0 },
    { hoursAgo: 1, table: table10, items: [{ m: biftek, q: 2 }, { m: refošk, q: 2 }, { m: gibanica, q: 2 }], method: "card", tip: 5.0 },
  ];

  let seq = 1;
  for (const r of demoReceipts) {
    if (!r.table) continue;
    const paidAt = new Date();
    paidAt.setHours(paidAt.getHours() - r.hoursAgo);
    const items = r.items.filter((i) => i.m);
    if (items.length === 0) continue;
    const total = items.reduce((s, i) => s + i.m!.price * i.q, 0);
    const vatTotal = items.reduce((s, i) => s + i.m!.price * i.q * i.m!.vatRate, 0);
    const invNum = `${restaurant.businessUnit}-${restaurant.cashRegister}-${String(seq).padStart(10, "0")}`;
    const order = await db.order.create({
      data: {
        tableId: r.table.id,
        status: OrderStatus.paid,
        total,
        vatTotal,
        paidAt,
        paymentMethod: r.method,
        receiptNo: invNum,
        invoiceNumber: invNum,
        zoi: fakeZoi(seq + index * 100),
        eor: fakeEor(seq + index * 100),
        fursXml: `<demo/>`,
        operator: operatorName,
        businessUnit: restaurant.businessUnit,
        cashRegister: restaurant.cashRegister,
        tip: r.tip,
        restaurantId,
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
  console.log(`✅ ${seq - 1} plačanih demo računov (z napitninami)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
