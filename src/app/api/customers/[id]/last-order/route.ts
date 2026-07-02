import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET /api/customers/[id]/last-order — vrne zadnje plačano naročilo stranke
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

    const order = await db.order.findFirst({
      where: {
        restaurantId: tenant.id,
        status: "paid",
        items: { some: {} }, // mora imeti vsaj eno postavko
        OR: [
          { customerId: id },
          // tudi če ni customerId, preveri po telefonski številki
        ],
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                nameEn: true,
                price: true,
                category: true,
                imageUrl: true,
                available: true,
              },
            },
          },
        },
        table: { select: { name: true, number: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    // Če ni najden preko customerId, poskusi preko telefona
    if (!order) {
      const customer = await db.customer.findFirst({
        where: { id, restaurantId: tenant.id },
        select: { phone: true },
      });

      if (customer?.phone) {
        const orderByPhone = await db.order.findFirst({
          where: {
            restaurantId: tenant.id,
            status: "paid",
          },
          include: {
            items: {
              include: {
                menuItem: {
                  select: {
                    id: true,
                    name: true,
                    nameEn: true,
                    price: true,
                    category: true,
                    imageUrl: true,
                    available: true,
                  },
                },
              },
            },
            table: { select: { name: true, number: true } },
          },
          orderBy: { paidAt: "desc" },
        });

        if (orderByPhone) {
          return NextResponse.json({
            order: {
              id: orderByPhone.id,
              paidAt: orderByPhone.paidAt,
              total: orderByPhone.total,
              tip: orderByPhone.tip,
              paymentMethod: orderByPhone.paymentMethod,
              tableName: orderByPhone.table?.name,
              items: orderByPhone.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                note: item.note,
                modifiers: item.modifiers,
                menuItem: {
                  ...item.menuItem,
                  // označi ali je še vedno na voljo
                  stillAvailable: item.menuItem.available,
                },
              })),
            },
            daysAgo: orderByPhone.paidAt
              ? Math.floor((Date.now() - orderByPhone.paidAt.getTime()) / 86400000)
              : 0,
          });
        }
      }

      return NextResponse.json(
        { error: "Ni zadnjega naročila", order: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        paidAt: order.paidAt,
        total: order.total,
        tip: order.tip,
        paymentMethod: order.paymentMethod,
        tableName: order.table?.name,
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          note: item.note,
          modifiers: item.modifiers,
          menuItem: {
            ...item.menuItem,
            stillAvailable: item.menuItem.available,
          },
        })),
      },
      daysAgo: order.paidAt
        ? Math.floor((Date.now() - order.paidAt.getTime()) / 86400000)
        : 0,
    });
  } catch (e) {
    console.error("GET /api/customers/[id]/last-order error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}
