import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/push/send — pošlji push notification (admin only)
// Body: { title, body, url?, customerId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: message, url, customerId } = body as {
      title: string;
      body: string;
      url?: string;
      customerId?: string;
    };

    if (!title || !message) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (title, body)" },
        { status: 400 }
      );
    }

    // V POC: Web Push zahteva web-push knjižnico na serverju
    // Za demo: log + simulacija
    console.log(`[Push] Sending to ${customerId || "all"}: ${title} - ${message}`);

    return NextResponse.json({
      success: true,
      message: "Push notification poslan (POC mode)",
      title,
      body: message,
      url: url || "/",
    });
  } catch (e) {
    console.error("POST /api/push/send error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
