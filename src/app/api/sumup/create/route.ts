import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { createTerminalPayment, getSumupConfig } from "@/lib/sumup";

export const dynamic = "force-dynamic";

// POST /api/sumup/create — ustvari plačilni zahtevek na Sumup terminalu
export async function POST(req: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const config = getSumupConfig();
    if (!config) {
      return NextResponse.json(
        {
          error: "Sumup ni konfiguriran. Nastavi SUMUP_API_KEY in SUMUP_MERCHANT_CODE v .env",
          mode: "poc",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { amount, orderId, description } = body as {
      amount: number;
      orderId?: string;
      description?: string;
    };

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Znesek mora biti pozitiven" }, { status: 400 });
    }

    const result = await createTerminalPayment(
      {
        amount,
        currency: "EUR",
        merchantCode: config.merchantCode,
        terminalId: config.terminalId,
        description: description || `POS plačilo`,
        merchantRef: orderId,
      },
      config
    );

    return NextResponse.json(result, { status: result.status === "FAILED" ? 400 : 200 });
  } catch (e) {
    console.error("POST /api/sumup/create error:", e);
    return NextResponse.json({ error: "Napaka pri Sumup klicu" }, { status: 500 });
  }
}
