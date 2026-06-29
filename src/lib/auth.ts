import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getTenantFromRequest } from "@/lib/tenant";

export interface AuthOperator {
  id: string;
  name: string;
  taxNumber: string;
  role: string;
  restaurantId: string;
  restaurantName: string;
}

// Prebere PIN iz header-ja in vrne operaterja (ali null)
// PIN je unique per restaurant — kombiniramo s tenant-om
export async function getOperatorFromRequest(
  req: NextRequest
): Promise<AuthOperator | null> {
  const pin = req.headers.get("x-operator-pin");
  if (!pin) return null;

  // Poišči tenant
  const tenant = await getTenantFromRequest(req);
  if (!tenant) return null;

  const operator = await db.operator.findFirst({
    where: { pin, restaurantId: tenant.id, active: true },
  });

  if (!operator) return null;

  return {
    id: operator.id,
    name: operator.name,
    taxNumber: operator.taxNumber,
    role: operator.role,
    restaurantId: tenant.id,
    restaurantName: tenant.name,
  };
}
