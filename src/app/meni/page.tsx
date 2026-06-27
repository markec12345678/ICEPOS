import { db } from "@/lib/db";
import { ISSUER } from "@/lib/furs";
import type { MenuItem } from "@/lib/types";
import { MenuClient } from "@/components/menu-client";

export const dynamic = "force-dynamic";

export default async function PublicMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ miza?: string }>;
}) {
  const sp = await searchParams;
  const tableNumber = sp.miza;

  const menuItems = await db.menuItem.findMany({
    where: { available: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const today = new Date().toISOString().slice(0, 10);
  const reservations = await db.reservation.findMany({
    where: { date: today, status: { in: ["confirmed", "seated"] } },
    include: { table: true },
    orderBy: { time: "asc" },
  });

  const clientItems: MenuItem[] = menuItems.map((m) => ({
    id: m.id,
    name: m.name,
    nameEn: m.nameEn,
    category: m.category as MenuItem["category"],
    price: m.price,
    vatRate: m.vatRate,
    available: m.available,
    desc: m.desc,
    descEn: m.descEn,
    allergens: m.allergens,
    calories: m.calories,
    protein: m.protein,
    carbs: m.carbs,
    fat: m.fat,
    isFavorite: m.isFavorite,
    isDailySpecial: m.isDailySpecial,
    createdAt: m.createdAt.toISOString(),
  }));

  const clientReservations = reservations.map((r) => ({
    time: r.time,
    tableName: r.table.name,
    partySize: r.partySize,
  }));

  return (
    <html lang="sl">
      <head>
        <title>{ISSUER.name} — Meni</title>
        <meta name="description" content={`Meni restavracije ${ISSUER.name}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #fafaf9;
                color: #1a1a1a;
                line-height: 1.6;
              }
              .container { max-width: 900px; margin: 0 auto; padding: 16px; padding-bottom: 100px; }
              .header {
                background: linear-gradient(135deg, #f59e0b, #ea580c);
                color: white;
                padding: 32px 16px;
                text-align: center;
                border-radius: 0 0 24px 24px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              }
              .header h1 { font-size: 28px; font-weight: 800; }
              .header .subtitle { font-size: 14px; opacity: 0.9; margin-top: 4px; }
              .header .info { display: flex; justify-content: center; gap: 16px; margin-top: 12px; font-size: 12px; flex-wrap: wrap; }
              .header .info span { display: flex; align-items: center; gap: 4px; }
              .table-badge {
                display: inline-block;
                background: white;
                color: #f59e0b;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 700;
                margin-top: 8px;
              }
              .footer { text-align: center; padding: 24px 16px; font-size: 12px; color: #666; }
              @media (max-width: 640px) {
                .header h1 { font-size: 22px; }
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="header">
          <h1>{ISSUER.name}</h1>
          <p className="subtitle">Restavracija · Pivnica · Sobiše</p>
          {tableNumber && (
            <div className="table-badge">📍 Miza {tableNumber}</div>
          )}
          <div className="info">
            <span>🕐 Pon–Ned: 10:00–23:00</span>
            <span>📍 {ISSUER.naslov}, {ISSUER.kraj}</span>
            <span>📞 01 234 5678</span>
          </div>
        </div>

        <div className="container">
          <MenuClient
            items={clientItems}
            tableNumber={tableNumber}
            reservations={clientReservations}
            issuer={{
              name: ISSUER.name,
              naslov: ISSUER.naslov,
              posta: ISSUER.posta,
              kraj: ISSUER.kraj,
              taxNumber: ISSUER.taxNumber,
            }}
          />

          <div className="footer">
            <p>
              {ISSUER.name} · {ISSUER.naslov}, {ISSUER.posta} {ISSUER.kraj}
            </p>
            <p style={{ marginTop: 8 }}>
              Davčna št.: SI{ISSUER.taxNumber} · Vse cene vključujejo DDV
            </p>
            <p style={{ marginTop: 8, fontSize: 11, color: "#999" }}>
              Za rezervacijo pokličite 01 234 5678
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
