import { db } from "@/lib/db";
import { ISSUER } from "@/lib/furs";
import { CATEGORIES, formatEUR } from "@/lib/types";
import { Store, Clock, MapPin, Phone, Star, UtensilsCrossed } from "lucide-react";

export const dynamic = "force-dynamic";

// Javna stran z menijem za goste (brez PIN-a, brez blagajne)
// Gost skenira QR kodo na mizi in vidi meni s cenami
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
              .container { max-width: 900px; margin: 0 auto; padding: 16px; }
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
              .section { margin: 24px 0; }
              .section-title {
                font-size: 18px;
                font-weight: 700;
                color: #92400e;
                border-bottom: 2px solid #fde68a;
                padding-bottom: 8px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .menu-item {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 12px;
                background: white;
                border-radius: 12px;
                margin-bottom: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                transition: transform 0.15s;
              }
              .menu-item:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .menu-item-info { flex: 1; }
              .menu-item-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
              .menu-item-desc { font-size: 12px; color: #666; margin-top: 2px; }
              .menu-item-price { font-size: 16px; font-weight: 700; color: #ea580c; white-space: nowrap; margin-left: 12px; }
              .badge-fav { background: #fef3c7; color: #92400e; font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: 600; }
              .badge-special { background: #fecdd3; color: #9f1239; font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: 600; }
              .reservations { background: #eff6ff; border-radius: 12px; padding: 16px; margin: 16px 0; }
              .reservations h3 { font-size: 14px; color: #1e40af; margin-bottom: 8px; }
              .reservations p { font-size: 12px; color: #333; margin: 4px 0; }
              .footer { text-align: center; padding: 24px 16px; font-size: 12px; color: #666; }
              .footer a { color: #ea580c; text-decoration: none; }
              @media (max-width: 640px) {
                .header h1 { font-size: 22px; }
                .menu-item-name { font-size: 14px; }
                .menu-item-price { font-size: 14px; }
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
            <span>
              <Clock size={14} /> Pon–Ned: 10:00–23:00
            </span>
            <span>
              <MapPin size={14} /> {ISSUER.naslov}, {ISSUER.kraj}
            </span>
            <span>
              <Phone size={14} /> 01 234 5678
            </span>
          </div>
        </div>

        <div className="container">
          {/* Dnevna ponudba */}
          {menuItems.filter((m) => m.isDailySpecial).length > 0 && (
            <div className="section">
              <div className="section-title">
                <UtensilsCrossed size={20} />
                🍽️ Dnevna ponudba
              </div>
              {menuItems
                .filter((m) => m.isDailySpecial)
                .map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-info">
                      <div className="menu-item-name">
                        {item.name}
                        <span className="badge-special">DANA</span>
                      </div>
                      {item.desc && (
                        <div className="menu-item-desc">{item.desc}</div>
                      )}
                    </div>
                    <div className="menu-item-price">{formatEUR(item.price)}</div>
                  </div>
                ))}
            </div>
          )}

          {/* Priljubljene */}
          {menuItems.filter((m) => m.isFavorite).length > 0 && (
            <div className="section">
              <div className="section-title">
                <Star size={20} />
                ⭐ Priljubljene
              </div>
              {menuItems
                .filter((m) => m.isFavorite)
                .map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-info">
                      <div className="menu-item-name">
                        {item.name}
                        <span className="badge-fav">⭐</span>
                      </div>
                      {item.desc && (
                        <div className="menu-item-desc">{item.desc}</div>
                      )}
                    </div>
                    <div className="menu-item-price">{formatEUR(item.price)}</div>
                  </div>
                ))}
            </div>
          )}

          {/* Kategorije */}
          {CATEGORIES.map((cat) => {
            const items = menuItems.filter((m) => m.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id} className="section">
                <div className="section-title">
                  <span>{cat.icon}</span>
                  {cat.label}
                </div>
                {items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="menu-item-info">
                      <div className="menu-item-name">
                        {item.name}
                        {item.isFavorite && (
                          <span className="badge-fav">⭐</span>
                        )}
                        {item.isDailySpecial && (
                          <span className="badge-special">DANA</span>
                        )}
                      </div>
                      {item.desc && (
                        <div className="menu-item-desc">{item.desc}</div>
                      )}
                    </div>
                    <div className="menu-item-price">{formatEUR(item.price)}</div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Današnje rezervacije */}
          {reservations.length > 0 && (
            <div className="reservations">
              <h3>📅 Današnje rezervacije</h3>
              {reservations.map((r) => (
                <p key={r.id}>
                  <strong>{r.time}</strong> — {r.table.name} ({r.partySize} oseb)
                </p>
              ))}
            </div>
          )}

          <div className="footer">
            <p>
              <Store size={14} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
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
