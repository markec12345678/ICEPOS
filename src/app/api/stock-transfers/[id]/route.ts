import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/stock-transfers/[id] — posamezen prenos
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const { id } = await params;

    const transfer = await db.stockTransfer.findFirst({
      where: { id, restaurantId: tenant.id },
      include: { items: true },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Prenos ni najden" }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (e) {
    console.error("GET /api/stock-transfers/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/stock-transfers/[id] — posodobi status
// Ko status → "sent": zmanjšaj zalogo v izvorni restavraciji
// Ko status → "received": povečaj zalogo v ciljni restavraciji
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko upravlja prenose" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, note } = body as { status: string; note?: string };

    if (!status) {
      return NextResponse.json({ error: "status je obvezen" }, { status: 400 });
    }

    const transfer = await db.stockTransfer.findFirst({
      where: { id, restaurantId: tenant.id },
      include: { items: true },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Prenos ni najden" }, { status: 404 });
    }

    // Validacija prehodov
    const validTransitions: Record<string, string[]> = {
      draft: ["sent", "cancelled"],
      sent: ["received", "cancelled"],
      received: [],
      cancelled: [],
    };

    if (!validTransitions[transfer.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Neveljaven prehod iz ${transfer.status} v ${status}` },
        { status: 400 }
      );
    }

    // Če pošiljamo → zmanjšaj zalogo v izvorni restavraciji
    if (status === "sent" && transfer.status === "draft") {
      for (const item of transfer.items) {
        if (item.inventoryItemId) {
          const inv = await db.inventoryItem.findFirst({
            where: { id: item.inventoryItemId, restaurantId: tenant.id },
          });
          if (inv) {
            await db.inventoryItem.update({
              where: { id: inv.id },
              data: { quantity: Math.max(0, inv.quantity - item.quantity) },
            });
          }
        }
      }
    }

    // Če prejmemo → povečaj zalogo v ciljni restavraciji
    if (status === "received" && transfer.status === "sent") {
      for (const item of transfer.items) {
        if (item.inventoryItemId) {
          // Poišči ali ustvari inventory item v ciljni restavraciji
          const targetInv = await db.inventoryItem.findFirst({
            where: {
              restaurantId: transfer.toRestaurantId,
              name: item.name,
            },
          });

          if (targetInv) {
            await db.inventoryItem.update({
              where: { id: targetInv.id },
              data: {
                quantity: targetInv.quantity + item.quantity,
                costPerUnit: item.unitCost, // posodobi ceno
              },
            });
          } else {
            // Ustvari nov inventory item v ciljni restavraciji
            await db.inventoryItem.create({
              data: {
                restaurantId: transfer.toRestaurantId,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
                costPerUnit: item.unitCost,
                category: "prenos",
              },
            });
          }
        }
      }
    }

    const updateData: { status: string; receivedDate?: Date; note?: string } = { status };
    if (status === "received") {
      updateData.receivedDate = new Date();
    }
    if (note !== undefined) {
      updateData.note = note;
    }

    const updated = await db.stockTransfer.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/stock-transfers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri posodabljanju" }, { status: 500 });
  }
}

// DELETE /api/stock-transfers/[id] — izbriši (samo draft)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše prenose" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const transfer = await db.stockTransfer.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Prenos ni najden" }, { status: 404 });
    }

    if (transfer.status !== "draft") {
      return NextResponse.json(
        { error: "Lahko izbrišeš samo osnutke (draft)" },
        { status: 400 }
      );
    }

    await db.stockTransfer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/stock-transfers/[id] error:", e);
    return NextResponse.json({ error: "Napaka pri brisanju" }, { status: 500 });
  }
}
