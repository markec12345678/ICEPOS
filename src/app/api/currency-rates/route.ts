import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/currency-rates — vsi tečaji valut
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const rates = await db.currencyRate.findMany({
      where: { restaurantId: tenant.id },
      orderBy: { currency: "asc" },
    });

    // Default valute (če ni nobene, predlagaj te)
    const DEFAULT_CURRENCIES = [
      { currency: "USD", symbol: "$", rate: 1.08 },
      { currency: "GBP", symbol: "£", rate: 0.85 },
      { currency: "CHF", symbol: "CHF", rate: 0.95 },
      { currency: "HRK", symbol: "kn", rate: 7.53 },
      { currency: "BAM", symbol: "KM", rate: 1.96 },
      { currency: "RSD", symbol: "din", rate: 117.5 },
    ];

    return NextResponse.json({
      rates,
      defaultCurrencies: DEFAULT_CURRENCIES,
      baseCurrency: tenant.currency || "EUR",
    });
  } catch (e) {
    console.error("GET /api/currency-rates error:", e);
    return NextResponse.json({ error: "Napaka pri pridobivanju tečajev" }, { status: 500 });
  }
}

// POST /api/currency-rates — dodaj nov tečaj
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja tečaje valut" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { currency, symbol, rate, buyRate, sellRate, note } = body as {
      currency: string;
      symbol: string;
      rate: number;
      buyRate?: number;
      sellRate?: number;
      note?: string;
    };

    if (!currency || !symbol || typeof rate !== "number" || rate <= 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (currency, symbol, rate)" },
        { status: 400 }
      );
    }

    // Preveri unikatnost
    const existing = await db.currencyRate.findFirst({
      where: { restaurantId: tenant.id, currency: currency.toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Valuta ${currency} že obstaja` },
        { status: 400 }
      );
    }

    const currencyRate = await db.currencyRate.create({
      data: {
        restaurantId: tenant.id,
        currency: currency.toUpperCase(),
        symbol,
        rate,
        buyRate: buyRate || null,
        sellRate: sellRate || null,
        note: note || null,
        active: true,
      },
    });

    return NextResponse.json(currencyRate, { status: 201 });
  } catch (e) {
    console.error("POST /api/currency-rates error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju tečaja" }, { status: 500 });
  }
}
