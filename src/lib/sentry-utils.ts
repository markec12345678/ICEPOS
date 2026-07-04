import * as Sentry from "@sentry/nextjs";

// ============================================================
// Sentry helper — varno captureException (deluje tudi če Sentry ni konfiguriran)
// ============================================================

/**
 * Captures exception v Sentry. Non-blocking — ne vrže napake če Sentry ni inicializiran.
 * Uporablja se v catch blokih API rut za reporting napak.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  try {
    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      if (context) {
        Sentry.captureException(error, {
          extra: context,
        });
      } else {
        Sentry.captureException(error);
      }
    }
    // Vedno logaj v console (za dev)
    console.error("[error]", error, context ? JSON.stringify(context) : "");
  } catch {
    // Sentry capture ne sme vrziti napake
  }
}

/**
 * Captures message v Sentry (info/warning level).
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
  try {
    if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
      Sentry.captureMessage(message, level);
    }
    console.log(`[${level}] ${message}`);
  } catch {
    // ignore
  }
}
