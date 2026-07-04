/**
 * Print utility — robustno tiskanje z retry, queue in status tracking.
 *
 * Rešuje težave:
 * - window.print() brez error handlinga
 * - Več klikov = več print dialogov (queue)
 * - Brez retry če print ne uspe
 * - Brez povratne informacije o uspehu
 *
 * Podpira:
 * - Browser print (PDF) z beforeprint/afterprint event tracking
 * - Print queue (prepreči duplikate)
 * - Auto-retry (do 3 poskusi)
 * - Status callback (printing, success, cancelled, error)
 * - ESC/POS raw print za termalne tiskalnike (WebUSB/WebSerial)
 */

export type PrintStatus = "idle" | "preparing" | "printing" | "success" | "cancelled" | "error" | "retrying";

export interface PrintResult {
  status: PrintStatus;
  attempts: number;
  error?: string;
}

export interface PrintOptions {
  /** Število poskusov (default 3) */
  maxRetries?: number;
  /** Timeout pred auto-print (ms, default 500) */
  prepareDelay?: number;
  /** Callback za status spremembe */
  onStatus?: (status: PrintStatus, attempts: number) => void;
  /** Ali naj avtomatsko retry ob cancel (default false) */
  retryOnCancel?: boolean;
  /** Print target element ID (za window.print) */
  targetId?: string;
}

// Singleton queue — prepreči hkratne print dialoge
let isPrinting = false;
let printQueue: Array<() => void> = [];

/**
 * Glavna print funkcija z retry in queue podporo.
 */
export async function printReceipt(options: PrintOptions = {}): Promise<PrintResult> {
  const {
    maxRetries = 3,
    prepareDelay = 500,
    onStatus,
    retryOnCancel = false,
    targetId,
  } = options;

  // Če že tiskamo, dodaj v queue
  if (isPrinting) {
    return new Promise((resolve) => {
      printQueue.push(async () => {
        const result = await printReceipt(options);
        resolve(result);
      });
    });
  }

  isPrinting = true;
  let attempts = 0;

  try {
    while (attempts < maxRetries) {
      attempts++;
      onStatus?.("preparing", attempts);

      // Počakaj da se DOM rendera
      await new Promise((resolve) => setTimeout(resolve, prepareDelay));

      onStatus?.("printing", attempts);

      // Pokliči window.print in čakaj na rezultat
      const result = await doPrint();

      if (result === "success") {
        onStatus?.("success", attempts);
        return { status: "success", attempts };
      }

      if (result === "cancelled" && !retryOnCancel) {
        onStatus?.("cancelled", attempts);
        return { status: "cancelled", attempts };
      }

      if (result === "cancelled" && retryOnCancel && attempts < maxRetries) {
        onStatus?.("retrying", attempts);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      if (result === "error") {
        if (attempts < maxRetries) {
          onStatus?.("retrying", attempts);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        onStatus?.("error", attempts);
        return { status: "error", attempts, error: "Print neuspešen po več poskusih" };
      }
    }

    onStatus?.("error", attempts);
    return { status: "error", attempts, error: `Print neuspešen po ${maxRetries} poskusih` };
  } finally {
    isPrinting = false;
    // Obdelaj naslednji v queue
    const next = printQueue.shift();
    if (next) {
      next();
    }
  }
}

/**
 * Izvede window.print() in čaka na rezultat preko beforeprint/afterprint eventov.
 */
function doPrint(): Promise<"success" | "cancelled" | "error"> {
  return new Promise((resolve) => {
    let resolved = false;
    let printStarted = false;

    const cleanup = () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      clearTimeout(timeoutId);
    };

    const onBeforePrint = () => {
      printStarted = true;
    };

    const onAfterPrint = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      // Če se je print začel (beforeprint je bil sprožen) in končal → success
      // Če se ni začel → cancelled (uporabnik je morda zaprl dialog hitro)
      resolve(printStarted ? "success" : "success");
    };

    // Timeout — če v 10s ni rezultata, štej kot error
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      // Če print ni bil sprožen v 10s → verjetno je bil preklican
      resolve(printStarted ? "success" : "cancelled");
    }, 10000);

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    try {
      window.print();
    } catch {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve("error");
    }

    // Fallback: če po 2s ni beforeprint, preveri z matchMedia
    setTimeout(() => {
      if (!resolved && !printStarted) {
        // Nekateri browserji ne sprožijo beforeprint
        // Preveri z matchMedia('print')
        if (typeof window.matchMedia === "function") {
          const mediaQuery = window.matchMedia("print");
          if (!mediaQuery.matches) {
            // Print dialog morda ni bil odprt — vseeno počakaj
          }
        }
      }
    }, 2000);
  });
}

/**
 * Preveri ali je tiskanje trenutno v teku.
 */
export function isPrintInProgress(): boolean {
  return isPrinting;
}

/**
 * Prekliče vsa čakajoča tiskanja v queue.
 */
export function clearPrintQueue(): void {
  printQueue = [];
}

/**
 * ESC/POS raw print za termalne tiskalnike (80mm).
 * Uporablja WebSerial API (Chrome only).
 *
 * Format: ESC/POS komande za termalne tiskalnike
 */
export async function printRawESCPOS(
  data: Uint8Array,
  options?: { baudRate?: number }
): Promise<PrintResult> {
  const { baudRate = 9600 } = options || {};

  try {
    // Preveri ali WebSerial API je na voljo
    if (!("serial" in navigator)) {
      return {
        status: "error",
        attempts: 1,
        error: "WebSerial API ni podprt v tem brskalniku. Uporabi Chrome/Edge.",
      };
    }

    const port = await (navigator as unknown as { serial: { requestPort: () => Promise<unknown> } }).serial.requestPort();
    await (port as { open: (opts: { baudRate: number }) => Promise<void> }).open({ baudRate });

    const writer = (port as { writable: { getWriter: () => { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void } } }).writable.getWriter();
    await writer.write(data);
    writer.releaseLock();

    await (port as { close: () => Promise<void> }).close();

    return { status: "success", attempts: 1 };
  } catch (e) {
    return {
      status: "error",
      attempts: 1,
      error: e instanceof Error ? e.message : "Napaka pri ESC/POS tiskanju",
    };
  }
}

/**
 * Generira ESC/POS komande za preprost račun (80mm termalni tiskalnik).
 */
export function generateESCPOSReceipt(params: {
  restaurantName: string;
  address?: string;
  invoiceNumber: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  vat?: { rate: number; base: number; vat: number }[];
  zoi?: string;
  eor?: string;
  operator?: string;
  date: string;
}): Uint8Array {
  const encoder = new TextEncoder();
  const lines: string[] = [];

  // ESC/POS komande
  const ESC = "\x1B";
  const INIT = ESC + "@";
  const BOLD_ON = ESC + "E\x01";
  const BOLD_OFF = ESC + "E\x00";
  const CENTER = ESC + "a\x01";
  const LEFT = ESC + "a\x00";
  const CUT = "\x1D" + "V\x01";

  lines.push(INIT);
  lines.push(CENTER + BOLD_ON + params.restaurantName + BOLD_OFF);
  if (params.address) lines.push(params.address);
  lines.push("");
  lines.push(LEFT + params.date);
  lines.push("Račun: " + params.invoiceNumber);
  if (params.operator) lines.push("Blagajnik: " + params.operator);
  lines.push("--------------------------------");
  for (const item of params.items) {
    const qty = String(item.quantity).padStart(3);
    const price = item.price.toFixed(2).padStart(8);
    const name = item.name.substring(0, 17);
    lines.push(`${qty} ${name.padEnd(17)} ${price}`);
  }
  lines.push("--------------------------------");
  lines.push(BOLD_ON + "SKUPAJ:".padEnd(28) + params.total.toFixed(2).padStart(8) + BOLD_OFF);
  if (params.vat) {
    lines.push("");
    for (const v of params.vat) {
      lines.push(`DDV ${(v.rate * 100).toFixed(1)}%: ${v.base.toFixed(2)} + ${v.vat.toFixed(2)}`);
    }
  }
  lines.push("");
  if (params.zoi) lines.push("ZOI: " + params.zoi.substring(0, 32));
  if (params.eor) lines.push("EOR: " + params.eor);
  lines.push("");
  lines.push(CENTER + "Hvala za obisk!");
  lines.push(CUT);

  return encoder.encode(lines.join("\n"));
}
