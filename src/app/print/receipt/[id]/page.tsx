import { db } from "@/lib/db";
import { ISSUER } from "@/lib/furs";
import { formatDateTime } from "@/lib/types";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

// Printabilna stran za račun (uporabnik natisne kot PDF preko brskalnika)
export default async function PrintReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      table: true,
      items: { include: { menuItem: true } },
    },
  });

  if (!order) {
    return (
      <html>
        <body>
          <p>Račun ni najden</p>
        </body>
      </html>
    );
  }

  // DDV po stopnjah
  const vatBuckets = new Map<number, { base: number; vat: number; gross: number }>();
  for (const it of order.items) {
    const lineGross = it.unitPrice * it.quantity;
    const lineVat = lineGross * it.vatRate;
    const lineBase = lineGross - lineVat;
    const existing = vatBuckets.get(it.vatRate);
    if (existing) {
      existing.base += lineBase;
      existing.vat += lineVat;
      existing.gross += lineGross;
    } else {
      vatBuckets.set(it.vatRate, { base: lineBase, vat: lineVat, gross: lineGross });
    }
  }

  const vatRows = Array.from(vatBuckets.entries()).sort((a, b) => b[0] - a[0]);

  return (
    <html lang="sl">
      <head>
        <title>Račun {order.invoiceNumber || order.receiptNo}</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: #1a1a1a;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; }
              .header h1 { font-size: 20px; color: #1a1a1a; }
              .header p { font-size: 12px; color: #666; margin-top: 4px; }
              .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; color: ${order.stornoOf ? "#dc2626" : "#1a1a1a"}; }
              .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; }
              .meta div { flex: 1; }
              .meta p { margin: 4px 0; color: #333; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
              th { text-align: left; padding: 8px; border-bottom: 2px solid #1a1a1a; font-weight: bold; }
              th.right { text-align: right; }
              th.center { text-align: center; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              td.right { text-align: right; }
              td.center { text-align: center; }
              .vat-section { margin: 20px 0; font-size: 12px; }
              .vat-section table { width: 50%; margin-left: auto; }
              .total { text-align: right; font-size: 18px; font-weight: bold; margin: 20px 0; padding: 10px; border-top: 2px solid #1a1a1a; }
              .furs { margin-top: 40px; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; font-size: 10px; }
              .furs .verified { color: #16a34a; font-weight: bold; margin-bottom: 8px; }
              .furs p { margin: 4px 0; word-break: break-all; color: #333; }
              .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #666; }
              .storno-banner { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; border-radius: 4px; }
              @media print {
                body { padding: 0; max-width: none; }
                .no-print { display: none; }
              }
              .print-btn {
                position: fixed; top: 20px; right: 20px;
                background: #f59e0b; color: white; border: none;
                padding: 12px 24px; border-radius: 8px; font-size: 14px;
                cursor: pointer; font-weight: bold;
              }
              .print-btn:hover { background: #d97706; }
            `,
          }}
        />
      </head>
      <body>
        <PrintButton />

        <div className="header">
          <h1>{ISSUER.name}</h1>
          <p>
            {ISSUER.naslov}, {ISSUER.posta} {ISSUER.kraj}
          </p>
          <p>Davčna št.: SI{ISSUER.taxNumber}</p>
          <p>
            Poslovni prostor: {order.businessUnit} · Blagajna: {order.cashRegister}
          </p>
        </div>

        <div className="title">{order.stornoOf ? "STORNO RAČUN" : "RAČUN"}</div>

        {order.stornoReason && (
          <div className="storno-banner">
            Razlog storna: {order.stornoReason}
          </div>
        )}

        <div className="meta">
          <div>
            <p>
              <strong>Številka:</strong> {order.invoiceNumber || order.receiptNo}
            </p>
            <p>
              <strong>Datum:</strong>{" "}
              {order.paidAt ? formatDateTime(order.paidAt as any) : "-"}
            </p>
            <p>
              <strong>Miza:</strong> {order.table.name}
            </p>
          </div>
          <div>
            <p>
              <strong>Blagajnik:</strong> {order.operator}
            </p>
            <p>
              <strong>Način plačila:</strong>{" "}
              {order.paymentMethod === "card" ? "Kartica" : "Gotovina"}
            </p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Artikel</th>
              <th className="center">Kol</th>
              <th className="right">Cena (€)</th>
              <th className="right">Skupaj (€)</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>{it.menuItem.name}</td>
                <td className="center">{it.quantity}</td>
                <td className="right">{it.unitPrice.toFixed(2)}</td>
                <td className="right">
                  {(it.unitPrice * it.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="vat-section">
          <table>
            <thead>
              <tr>
                <th>Stopnja</th>
                <th className="right">Osnova</th>
                <th className="right">DDV</th>
                <th className="right">Bruto</th>
              </tr>
            </thead>
            <tbody>
              {vatRows.map(([rate, v]) => (
                <tr key={rate}>
                  <td>{(rate * 100).toFixed(1)}%</td>
                  <td className="right">{v.base.toFixed(2)} €</td>
                  <td className="right">{v.vat.toFixed(2)} €</td>
                  <td className="right">{v.gross.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="total">SKUPAJ: {order.total.toFixed(2)} €</div>

        {order.tip > 0 && (
          <div className="total" style={{ fontSize: 14, color: "#16a34a" }}>
            Napitnina: {order.tip.toFixed(2)} €
          </div>
        )}

        <div className="furs">
          <div className="verified">✓ FURS — SRS fiskaliziran</div>
          <p>
            <strong>ZOI:</strong> {order.zoi || "-"}
          </p>
          <p>
            <strong>EOR:</strong> {order.eor || "-"}
          </p>
        </div>

        <div className="footer">
          <p>Hvala za obisk in lep pozdrav!</p>
          <p style={{ marginTop: 8, fontSize: 10 }}>
            Račun je bil fiskaliziran pri FURS. Fiskalni podatki so zakonsko
            zaščiteni.
          </p>
        </div>
      </body>
    </html>
  );
}
