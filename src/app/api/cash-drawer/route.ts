import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Direkcije toku gotovine glede na tip vnosa
const IN_TYPES = new Set(["cash_in", "sale", "start"]);
const VALID_TYPES = new Set([
  "cash_in",
  "cash_out",
  "sale",
  "refund",
  "petty",
  "start",
  "end",
]);

function directionFor(type: string): "in" | "out" {
  return IN_TYPES.has(type) ? "in" : "out";
}

// Trenutno stanje gotovine = vsota vhodov - vsota izhodov
async function currentBalance(restaurantId: string): Promise<number> {
  const entries = await db.cashDrawerEntry.findMany({
    where: { restaurantId },
    select: { direction: true, amount: true },
  });
  let bal = 0;
  for (const e of entries) {
    bal += e.direction === "in" ? e.amount : -e.amount;
  }
  return bal;
}

// GET /api/cash-drawer — vrne vnose v gotovinski blagajni za restavracijo
// Podpora query parametrom:
//   ?date=YYYY-MM-DD — filter po datumu (cel dan)
//   ?shiftId=xxx      — filter po smeni
//   ?type=cash_in     — filter po tipu
// Default: zadnjih 100 vnosov, razvrščeno po createdAt desc
export async function GET(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const sp = req.nextUrl.searchParams;
    const date = sp.get("date");
    const shiftId = sp.get("shiftId");
    const type = sp.get("type");

    const where: {
      restaurantId: string;
      createdAt?: { gte: Date; lte: Date };
      shiftId?: string;
      type?: string;
    } = { restaurantId: tenant.id };

    if (shiftId) where.shiftId = shiftId;
    if (type && VALID_TYPES.has(type)) where.type = type;

    if (date) {
      // Parse YYYY-MM-DD (lokalno) → določi začetek/konec dneva v UTC
      const [y, m, d] = date.split("-").map(Number);
      if (y && m && d) {
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        where.createdAt = { gte: start, lte: end };
      }
    }

    const entries = await db.cashDrawerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(entries);
  } catch (e) {
    console.error("GET /api/cash-drawer error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/cash-drawer — ustvari nov vnos v gotovinsko blagajno
// Auto: direction, balanceBefore, balanceAfter
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json(
        { error: "Potrebna je prijava blagajnika" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, amount, reason, operator, shiftId } = body as {
      type: string;
      amount: number;
      reason?: string;
      operator?: string;
      shiftId?: string;
    };

    if (!type || !VALID_TYPES.has(type)) {
      return NextResponse.json(
        {
          error:
            "Manjkajoč ali neveljaven tip (cash_in, cash_out, sale, refund, petty, start, end)",
        },
        { status: 400 }
      );
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Znesek mora biti pozitivno število" },
        { status: 400 }
      );
    }

    const direction = directionFor(type);
    const balanceBefore = await currentBalance(tenant.id);
    const balanceAfter =
      balanceBefore + (direction === "in" ? amt : -amt);

    const entry = await db.cashDrawerEntry.create({
      data: {
        restaurantId: tenant.id,
        type,
        amount: amt,
        direction,
        reason: reason || null,
        operator: operator || authOp.name,
        shiftId: shiftId || null,
        balanceBefore,
        balanceAfter,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error("POST /api/cash-drawer error:", e);
    return NextResponse.json(
      { error: "Napaka pri ustvarjanju vnosa" },
      { status: 500 }
    );
  }
}
