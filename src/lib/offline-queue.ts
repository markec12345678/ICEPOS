/**
 * Offline fiscalization queue — FURS fiskalizacija v vrsti ko ni povezave.
 *
 * Ko restavracija izgubi povezavo, se računi shranijo v localStorage.
 * Ko se povezava vrne, se vsi čakajoči računi fiskalizirajo v vrstnem redu.
 *
 * FURS dovoljuje kasnejšo fiskalizacijo (do 48h po izdaji računa).
 */

const QUEUE_KEY = "icepos_fiscal_queue";
const MAX_AGE_HOURS = 48;

export interface QueuedInvoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  zoi: string;
  operator: string;
  operatorTaxNo: string;
  total: number;
  createdAt: string; // ISO
  attempts: number;
  lastAttempt: string | null;
  error: string | null;
}

/**
 * Preveri ali je naprava online.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

/**
 * Prebere čakajoče račune iz queue.
 */
export function getQueuedInvoices(): QueuedInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedInvoice[];
    // Filtriraj stale (starejše od 48h)
    const now = Date.now();
    return parsed.filter((inv) => {
      const age = (now - new Date(inv.createdAt).getTime()) / 3600000;
      return age <= MAX_AGE_HOURS;
    });
  } catch {
    return [];
  }
}

/**
 * Doda račun v offline queue.
 */
export function enqueueInvoice(invoice: Omit<QueuedInvoice, "id" | "attempts" | "lastAttempt" | "error">): void {
  if (typeof window === "undefined") return;
  const queue = getQueuedInvoices();
  const entry: QueuedInvoice = {
    ...invoice,
    id: `fiscal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    attempts: 0,
    lastAttempt: null,
    error: null,
  };
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  // Obvesti komponente
  window.dispatchEvent(new CustomEvent("fiscal-queue-updated", { detail: { count: queue.length } }));
}

/**
 * Odstrani račun iz queue (uspešna fiskalizacija).
 */
export function dequeueInvoice(id: string): void {
  if (typeof window === "undefined") return;
  const queue = getQueuedInvoices().filter((inv) => inv.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("fiscal-queue-updated", { detail: { count: queue.length } }));
}

/**
 * Posodobi poskus fiskalizacije (neuspešen).
 */
export function updateAttempt(id: string, error: string): void {
  if (typeof window === "undefined") return;
  const queue = getQueuedInvoices().map((inv) =>
    inv.id === id
      ? { ...inv, attempts: inv.attempts + 1, lastAttempt: new Date().toISOString(), error }
      : inv
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Število čakajočih računov.
 */
export function getQueueCount(): number {
  return getQueuedInvoices().length;
}

/**
 * Ali so računi v queue (prikaz opozorila).
 */
export function hasPendingInvoices(): boolean {
  return getQueueCount() > 0;
}

/**
 * Počisti queue (samo za debug/admin).
 */
export function clearQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new CustomEvent("fiscal-queue-updated", { detail: { count: 0 } }));
}

/**
 * Vrne starost najstarejšega računa v urah.
 */
export function getOldestInvoiceAgeHours(): number {
  const queue = getQueuedInvoices();
  if (queue.length === 0) return 0;
  const oldest = queue.reduce((min, inv) =>
    new Date(inv.createdAt) < new Date(min.createdAt) ? inv : min
  );
  return (Date.now() - new Date(oldest.createdAt).getTime()) / 3600000;
}
