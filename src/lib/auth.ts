import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export interface AuthOperator {
  id: string;
  name: string;
  taxNumber: string;
  role: string;
}

// Prebere PIN iz header-ja in vrne operaterja (ali null)
export async function getOperatorFromRequest(
  req: NextRequest
): Promise<AuthOperator | null> {
  const pin = req.headers.get("x-operator-pin");
  if (!pin) return null;

  const operator = await db.operator.findFirst({
    where: { pin, active: true },
  });

  if (!operator) return null;

  return {
    id: operator.id,
    name: operator.name,
    taxNumber: operator.taxNumber,
    role: operator.role,
  };
}
