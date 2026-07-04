/**
 * Offline data cache — caching menu/tables/stats podatkov za offline dostop.
 * Uporablja localStorage za hitro dostopanje do zadnjih podatkov.
 *
 * Ko je aplikacija offline, uporabnik še vedno lahko:
 * - Vidi meni (za dodajanje v košarico)
 * - Vidi mize in njihova imena
 * - Vidi statistiko (zadnja znana)
 */

const CACHE_PREFIX = "icepos_cache_";
const MAX_AGE_MINUTES = 30; // cache veljaven 30 minut

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Shrani podatke v cache.
 */
export function setCached<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage je poln ali nedosegljiv
  }
}

/**
 * Prebere podatke iz cache.
 * Vrne null če cache ne obstaja ali je potekel.
 */
export function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = (Date.now() - entry.timestamp) / 60000;
    if (age > MAX_AGE_MINUTES) {
      // Cache potekel — vendar vrnemo podatke če je offline
      if (!navigator.onLine) {
        return entry.data;
      }
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Vrne starost cache v minutah.
 */
export function getCacheAge(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<unknown>;
    return Math.round((Date.now() - entry.timestamp) / 60000);
  } catch {
    return null;
  }
}

/**
 * Počisti vse cache podatke.
 */
export function clearCache(): void {
  if (typeof window === "undefined") return;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Fetch wrapper z offline cache podporo.
 * Če je online: fetch + cache rezultat.
 * Če je offline: vrni cached podatke.
 */
export async function fetchWithCache<T>(url: string): Promise<T | null> {
  const cacheKey = url.replace(/[^a-zA-Z0-9]/g, "_");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    // Offline — vrni cache
    return getCached<T>(cacheKey);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Napaka — poskusi cache
      return getCached<T>(cacheKey);
    }
    const data = await res.json();
    setCached(cacheKey, data);
    return data as T;
  } catch {
    // Napaka v fetch — vrni cache
    return getCached<T>(cacheKey);
  }
}
