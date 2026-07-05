import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildQrPayload } from "@/lib/furs";
import { getTenantFromRequest } from "@/lib/tenant";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// Generira QR kodo (data URL) za FURS račun po specifikaciji
// Tenant-scoped — preprečuje cross-tenant IDOR
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant ni najden" }, { status: 400 });
    }

    // Tenant-scoped lookup
    const order = await db.order.findFirst({
      where: { id, restaurantId: tenant.id },
      select: {
        zoi: true,
        paidAt: true,
        status: true,
        stornoOf: true,
      },
    });

    if (!order || !order.zoi || !order.paidAt) {
      return NextResponse.json(
        { error: "Račun ni najden ali nima ZOI" },
        { status: 404 }
      );
    }

    // Uporabi tenant taxNumber (ne hardcoded ISSUER.taxNumber)
    const taxNumber = tenant.taxNumber.replace(/^SI/i, "");
    const payload = buildQrPayload(
      order.zoi,
      order.paidAt,
      taxNumber
    );

    // Generiraj QR kot SVG data URL (ostri pri printu, majhen)
    const svgString = await QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(
      svgString,
      "utf-8"
    ).toString("base64")}`;

    return NextResponse.json({
      dataUrl,
      payload,
      isStorno: !!order.stornoOf,
    });
  } catch (e) {
    console.error("GET /api/orders/[id]/qr error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
