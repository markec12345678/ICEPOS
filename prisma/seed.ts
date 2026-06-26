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

  // Počisti
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
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

  console.log("🎉 Seed končan!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
