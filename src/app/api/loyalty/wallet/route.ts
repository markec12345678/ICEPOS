import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/loyalty/wallet?token=xxx — vrne stanje predplačilne kartice
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Manjka token" }, { status: 401 });
    }

    const customer = await db.customer.findFirst({
      where: { id: token, restaurantId: tenant.id },
      select: { id: true, name: true, note: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    // V POC: wallet stanje shranimo v customer.note kot JSON
    // V produkciji: dodati CustomerWallet model v Prisma
    let wallet = { balance: 0, transactions: [] as WalletTransaction[] };
    if (customer.note) {
      try {
        const parsed = JSON.parse(customer.note);
        if (parsed.wallet) {
          wallet = parsed.wallet;
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      balance: wallet.balance || 0,
      transactions: wallet.transactions || [],
    });
  } catch (e) {
    console.error("GET /api/loyalty/wallet error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/loyalty/wallet — polni kartico ali porabi
// Body: { token, action: "topup" | "spend", amount, description? }
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const body = await req.json();
    const { token, action, amount, description } = body as {
      token: string;
      action: "topup" | "spend";
      amount: number;
      description?: string;
    };

    if (!token || !action || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (token, action, amount)" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { id: token, restaurantId: tenant.id },
    });

    if (!customer) {
      return NextResponse.json({ error: "Stranka ni najdena" }, { status: 404 });
    }

    // Preberi trenutno stanje iz note (POC)
    let wallet = { balance: 0, transactions: [] as WalletTransaction[] };
    let otherNote = "";
    if (customer.note) {
      try {
        const parsed = JSON.parse(customer.note);
        if (parsed.wallet) {
          wallet = parsed.wallet;
          otherNote = parsed.note || "";
        } else {
          otherNote = customer.note;
        }
      } catch {
        otherNote = customer.note;
      }
    }

    const transaction: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: action,
      amount: action === "topup" ? amount : -amount,
      description: description || (action === "topup" ? "Polnitev kartice" : "Plačilo"),
      timestamp: new Date().toISOString(),
    };

    if (action === "topup") {
      wallet.balance += amount;
    } else {
      // Spend — preveri ali ima dovolj sredstev
      if (wallet.balance < amount) {
        return NextResponse.json(
          { error: `Premajhno stanje (${wallet.balance.toFixed(2)}€) za ${amount}€` },
          { status: 400 }
        );
      }
      wallet.balance -= amount;
    }

    wallet.transactions = [transaction, ...wallet.transactions].slice(0, 50);

    // Shrani nazaj v note kot JSON
    await db.customer.update({
      where: { id: customer.id },
      data: {
        note: JSON.stringify({ wallet, note: otherNote }),
      },
    });

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      transaction,
      message:
        action === "topup"
          ? `Kartica naložena z ${amount}€`
          : `Plačilo ${amount}€ uspešno`,
    });
  } catch (e) {
    console.error("POST /api/loyalty/wallet error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

interface WalletTransaction {
  id: string;
  type: "topup" | "spend";
  amount: number; // pozitivno za topup, negativno za spend
  description: string;
  timestamp: string;
}
