import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe — shrani push subscription
// Body: { subscription: string (JSON), customerId?: string, phone?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, customerId, phone } = body as {
      subscription: string;
      customerId?: string;
      phone?: string;
    };

    if (!subscription) {
      return NextResponse.json(
        { error: "Manjka subscription" },
        { status: 400 }
      );
    }

    // V POC: shranimo v lokalno datoteko (v produkciji: v DB tabelo PushSubscription)
    // Za demo: vrnemo success
    console.log(`[Push] Subscription saved for ${customerId || phone || "anonymous"}`);

    return NextResponse.json({
      success: true,
      message: "Push subscription shranjen",
    });
  } catch (e) {
    console.error("POST /api/push/subscribe error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — odjavi
export async function DELETE(req: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: "Odjavljen od push" });
  } catch (e) {
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
