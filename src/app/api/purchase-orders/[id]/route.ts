import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOperatorFromRequest } from "@/lib/auth";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/purchase-orders/[id] — vrne posamezni nabavni nalog (tenant check)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const po = await db.purchaseOrder.findFirst({
      where: { id, restaurantId: tenant.id },
      include: {
        supplier: true,
        items: true,
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: "Nabavni nalog ni najden" },
        { status: 404 }
      );
    }

    return NextResponse.json(po);
  } catch (e) {
    console.error("GET /api/purchase-orders/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// PATCH /api/purchase-orders/[id] — posodobi status / note / expectedDate / discountPercent
// Če status preide v "received":
//   - receivedDate = now()
//   - za vsako postavko receivedQty = quantity (polna prevzem)
//   - posodobi povezane InventoryItem: quantity += item.quantity in costPerUnit = item.unitCost (latest)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko ureja nabavne naloge" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.purchaseOrder.findFirst({
      where: { id, restaurantId: tenant.id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Nabavni nalog ni najden" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      status,
      note,
      expectedDate,
      discountPercent,
    } = body as {
      status?: string;
      note?: string | null;
      expectedDate?: string | null;
      discountPercent?: number;
    };

    // Validacija statusa
    const allowedStatuses = ["draft", "sent", "received", "cancelled"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Neveljaven status" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (typeof status === "string") updateData.status = status;
    if (typeof note === "string") updateData.note = note.trim() || null;
    if (expectedDate !== undefined) {
      updateData.expectedDate = expectedDate ? new Date(expectedDate) : null;
    }

    // Pri spremembi popusta ponovno izračunaj totalAmount
    if (typeof discountPercent === "number") {
      updateData.discountPercent = discountPercent;
      const subtotal = existing.items.reduce(
        (sum, it) => sum + it.lineTotal,
        0
      );
      updateData.totalAmount = subtotal * (1 - discountPercent / 100);
    }

    // Prejem naročila — trigger posodobitev inventarja
    const willReceive =
      status === "received" && existing.status !== "received";

    if (willReceive) {
      updateData.receivedDate = new Date();

      // Transakcijsko: posodobi PO + items + inventory
      const result = await db.$transaction(async (tx) => {
        // 1) Posodobi postavke (receivedQty = quantity)
        for (const item of existing.items) {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { receivedQty: item.quantity },
          });

          // 2) Posodobi povezan InventoryItem (če obstaja povezava)
          if (item.inventoryItemId) {
            const inv = await tx.inventoryItem.findFirst({
              where: {
                id: item.inventoryItemId,
                restaurantId: tenant.id,
              },
              select: { id: true, quantity: true },
            });
            if (inv) {
              await tx.inventoryItem.update({
                where: { id: inv.id },
                data: {
                  quantity: inv.quantity + item.quantity,
                  costPerUnit: item.unitCost,
                },
              });
            }
          }
        }

        // 3) Posodobi PO
        const updated = await tx.purchaseOrder.update({
          where: { id },
          data: updateData,
          include: { supplier: true, items: true },
        });

        return updated;
      });

      return NextResponse.json(result);
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { supplier: true, items: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/purchase-orders/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// DELETE /api/purchase-orders/[id] — samo če je status === "draft"
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json(
        { error: "Restavracija ni najdena" },
        { status: 400 }
      );
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp || authOp.role !== "admin") {
      return NextResponse.json(
        { error: "Samo admin lahko briše nabavne naloge" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await db.purchaseOrder.findFirst({
      where: { id, restaurantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Nabavni nalog ni najden" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        {
          error:
            "Nabavni nalog lahko izbrišeš samo v statusu 'osnutek'. Prekliči ali arhiviraj namesto tega.",
        },
        { status: 400 }
      );
    }

    await db.purchaseOrder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/purchase-orders/[id] error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
