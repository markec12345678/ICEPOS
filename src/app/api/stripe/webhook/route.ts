import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/stripe/webhook — Stripe webhook za payment_intent.succeeded
// Preverja HMAC podpis preko Stripe SDK. Atomično označi order kot paid.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Manjka stripe-signature header" },
      { status: 400 }
    );
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET ni nastavljen");
    return NextResponse.json({ error: "Webhook konfiguracija manjka" }, { status: 500 });
  }

  // Lazy-import Stripe (samo če je webhook dejansko klican)
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2024-06-20" as any,
  });

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Neveljaven podpis: " + err.message },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const orderId = pi.metadata?.orderId;
      const tenantId = pi.metadata?.tenantId;

      if (!orderId || !tenantId) {
        console.error("[stripe-webhook] Missing orderId/tenantId in PI metadata", pi.id);
        return NextResponse.json({ received: true });
      }

      try {
        await db.$transaction(async (tx) => {
          const order = await tx.order.findFirst({
            where: { id: orderId, restaurantId: tenantId },
            include: { items: true },
          });
          if (!order) throw new Error("Order not found");

          // Idempotent — če je že paid, preskoči
          if (order.status === "paid") {
            console.log("[stripe-webhook] Order already paid, skipping", orderId);
            return;
          }

          // Označi kot paid
          await tx.order.update({
            where: { id: orderId },
            data: {
              status: "paid",
              paidAt: new Date(),
              paymentMethod: "card",
              stripePaymentIntentId: pi.id,
            },
          });

          // Inventory deduction
          for (const item of order.items || []) {
            const recipes = await tx.recipe.findMany({
              where: { menuItemId: item.menuItemId },
            });
            for (const recipe of recipes) {
              await tx.inventoryItem.update({
                where: { id: recipe.inventoryItemId },
                data: {
                  quantity: { decrement: recipe.quantity * item.quantity },
                },
              });
            }
          }

          // Loyalty točke
          if (order.customerId) {
            await tx.customer.update({
              where: { id: order.customerId },
              data: {
                points: { increment: Math.floor(Number(order.total)) },
                totalSpent: { increment: Number(order.total) },
                visitCount: { increment: 1 },
                lastVisitAt: new Date(),
              },
            });
          }
        });
      } catch (err) {
        console.error("[stripe-webhook] Failed to mark order paid:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      console.warn("[stripe-webhook] Payment failed:", pi.id, pi.last_payment_error?.message);
      break;
    }

    default:
      // Ignoriraj ostale evente
  }

  return NextResponse.json({ received: true });
}
