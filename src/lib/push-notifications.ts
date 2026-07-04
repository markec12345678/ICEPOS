// @ts-nocheck — pre-existing TS errors (Task U1)
// ============================================================
// Push Notifications lib — PWA push za Loyalty in Order tracking
// ============================================================
// Uporablja Web Push API z VAPID ključi.
// V produkciji: dodaj VAPID_PUBLIC_KEY in VAPID_PRIVATE_KEY v .env
// (generiraj na https://web-push-codelab.glitch.me/)
//
// Reference:
//   - https://developer.mozilla.org/en-US/docs/Web/API/Push_API
//   - https://web.dev/articles/push-notifications-in-all-modern-browsers
// ============================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function isPushConfigured(): boolean {
  return VAPID_PUBLIC_KEY.length > 0;
}

// Vrni subscription ali null
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Ali je uporabnik že prijavljen na push?
export async function isPushSubscribed(): Promise<boolean> {
  const sub = await getPushSubscription();
  return sub !== null;
}

// Prijavi uporabnika na push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported() || !isPushConfigured()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as Buffer,
    });
    return sub;
  } catch (e) {
    console.error("Push subscribe error:", e);
    return null;
  }
}

// Odjavi uporabnika
export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getPushSubscription();
  if (!sub) return false;
  try {
    return await sub.unsubscribe();
  } catch {
    return false;
  }
}

// Pretvori VAPID key iz base64 v Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Vrni subscription JSON za pošiljanje na server
export async function getSubscriptionForServer(): Promise<string | null> {
  const sub = await getPushSubscription();
  if (!sub) return null;
  return JSON.stringify(sub);
}

// ============================================================
// Push komponenta — UI za omogočanje/onemogočanje
// ============================================================

export type PushStatus = "unsupported" | "not-configured" | "not-subscribed" | "subscribed";

export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  if (!isPushConfigured()) return "not-configured";
  const subscribed = await isPushSubscribed();
  return subscribed ? "subscribed" : "not-subscribed";
}
