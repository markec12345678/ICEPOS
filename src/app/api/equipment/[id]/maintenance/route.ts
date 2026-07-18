import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";
import { getOperatorFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/equipment/[id]/maintenance — vsi maintenance logi za opremo
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

    const equipment = await db.equipment.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Oprema ni najdena" }, { status: 404 });
    }

    const logs = await db.equipmentMaintenance.findMany({
      where: { equipmentId: id },
      orderBy: { serviceDate: "desc" },
    });

    return NextResponse.json(logs);
  } catch (e) {
    console.error("GET /api/equipment/[id]/maintenance error:", e);
    return NextResponse.json({ error: "Napaka" }, { status: 500 });
  }
}

// POST /api/equipment/[id]/maintenance — dodaj maintenance log
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await getTenantFromRequest(req);
    if (!tenant) {
      return NextResponse.json({ error: "Restavracija ni najdena" }, { status: 400 });
    }

    const authOp = await getOperatorFromRequest(req);
    if (!authOp) {
      return NextResponse.json(
        { error: "Potrebna je prijava" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const equipment = await db.equipment.findFirst({
      where: { id, restaurantId: tenant.id },
    });
    if (!equipment) {
      return NextResponse.json({ error: "Oprema ni najdena" }, { status: 404 });
    }

    const body = await req.json();
    const { type, description, cost, technician, serviceDate, nextServiceDate, note, status } = body as {
      type: string;
      description: string;
      cost?: number;
      technician?: string;
      serviceDate?: string;
      nextServiceDate?: string;
      note?: string;
      status?: string;
    };

    if (!type || !description) {
      return NextResponse.json(
        { error: "Manjkajoči podatki (type, description)" },
        { status: 400 }
      );
    }

    const sDate = serviceDate ? new Date(serviceDate) : new Date();
    const nDate = nextServiceDate
      ? new Date(nextServiceDate)
      : new Date(sDate.getTime() + equipment.serviceIntervalDays * 24 * 60 * 60 * 1000);

    const log = await db.equipmentMaintenance.create({
      data: {
        equipmentId: id,
        type,
        description,
        cost: cost || 0,
        technician: technician || null,
        serviceDate: sDate,
        nextServiceDate: nDate,
        note: note || null,
        status: status || "completed",
      },
    });

    // Posodobi equipment: lastServiceDate, nextServiceDate
    await db.equipment.update({
      where: { id },
      data: {
        lastServiceDate: sDate,
        nextServiceDate: nDate,
        status: status === "scheduled" ? "maintenance" : equipment.status,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (e) {
    console.error("POST /api/equipment/[id]/maintenance error:", e);
    return NextResponse.json({ error: "Napaka pri dodajanju log-a" }, { status: 500 });
  }
}
