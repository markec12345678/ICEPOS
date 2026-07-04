import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// ============================================================
// AUDIT LOG — beleženje kritičnih sprememb za FURS skladnost
// ============================================================

export type AuditAction =
  | "furs_fiscalize"
  | "furs_storno"
  | "furs_ini"
  | "payment"
  | "storno"
  | "pin_change"
  | "tenant_config"
  | "operator_create"
  | "operator_delete"
  | "inventory_adjust"
  | "gift_card_redeem"
  | "loyalty_redeem";

export interface AuditLogEntry {
  restaurantId: string;
  operatorId?: string;
  operatorName?: string;
  ipAddress?: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Zapiše audit log vnos. Non-blocking (ne vrže napake če pisanje fails).
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        restaurantId: entry.restaurantId,
        operatorId: entry.operatorId || null,
        operatorName: entry.operatorName || null,
        ipAddress: entry.ipAddress || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        description: entry.description,
        oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        success: entry.success ?? true,
        errorMessage: entry.errorMessage || null,
      },
    });
  } catch (e) {
    // Non-blocking — audit log failure ne sme prekiniti poslovanja
    console.error("[audit] Failed to write audit log:", e);
  }
}

/**
 * Pridobi IP naslov iz zahtevka.
 */
export function getIpAddress(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
