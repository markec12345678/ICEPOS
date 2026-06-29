// ============================================================
// Notifications lib — Email/SMS simulacija
// ============================================================
// Ker v tem okolju nimamo SMTP ali SMS gateway, hranimo
// "poslane" notifikacije v DB (NotificationLog model) z
// generirano vsebino. V produkciji zamenjaj z resničnim
// SMTP (nodemailer) ali SMS gateway (Twilio, Vesna, ...).
// ============================================================

import { db } from "./db";

export type NotificationType =
  | "reservation_confirmation"
  | "reservation_reminder"
  | "order_confirmation"
  | "order_ready"
  | "shift_reminder";

export interface NotificationPayload {
  type: NotificationType;
  to: string; // email ali telefon
  customerName: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Predloge sporočil (slovensko)
// ============================================================

export function buildReservationConfirmation(
  customerName: string,
  date: string,
  time: string,
  partySize: number,
  tableName: string
): NotificationPayload {
  const slDate = new Date(date).toLocaleDateString("sl-SI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    type: "reservation_confirmation",
    to: "",
    customerName,
    subject: `Potrditev rezervacije — Gostilna Pri Marku`,
    body: `Pozdravljeni ${customerName},

Hvala za vašo rezervacijo pri Gostilni Pri Marku!

📅 Datum: ${slDate}
⏰ Čas: ${time} (miza ${tableName})
👥 Število oseb: ${partySize}

Prosimo, pridobite 5 minut pred rezervacijo. Če boste zamudili ali želite spremembo, pokličite 01 234 56 78.

Veselimo se vašega obiska!

Lep pozdrav,
Gostilna Pri Marku`,
    metadata: { date, time, partySize, tableName },
  };
}

export function buildOrderConfirmation(
  customerName: string,
  orderId: string,
  total: number,
  items: { name: string; quantity: number; price: number }[],
  takeaway: boolean
): NotificationPayload {
  const itemsList = items
    .map((i) => `  • ${i.quantity}× ${i.name} — ${formatEUR(i.price * i.quantity)}`)
    .join("\n");

  return {
    type: "order_confirmation",
    to: "",
    customerName,
    subject: `Potrditev naročila #${orderId.slice(-6).toUpperCase()}`,
    body: `Pozdravljeni ${customerName},

Hvala za vaše naročilo!

🧾 ID naročila: ${orderId.slice(-6).toUpperCase()}
${takeaway ? "🍔 Tip: Poberi sam (takeaway)" : "🍽️ Tip: Na mizi"}

Postavke:
${itemsList}

💰 Skupaj: ${formatEUR(total)}

Sledite statusu naročila na: /sledi/${orderId}

Lep pozdrav,
Gostilna Pri Marku`,
    metadata: { orderId, total, takeaway },
  };
}

export function buildOrderReady(
  customerName: string,
  orderId: string,
  tableName?: string
): NotificationPayload {
  return {
    type: "order_ready",
    to: "",
    customerName,
    subject: `Naročilo pripravljeno — ${orderId.slice(-6).toUpperCase()}`,
    body: `Pozdravljeni ${customerName},

Vaše naročilo je pripravljeno! ${tableName ? `Miza ${tableName} — postreženo.` : "Pridite prevzeti."}

Hvala za vaš obisk!

Gostilna Pri Marku`,
    metadata: { orderId, tableName },
  };
}

// ============================================================
// Glavna funkcija — pošlji (shrani v DB)
// ============================================================

export async function sendNotification(
  payload: NotificationPayload,
  channel: "email" | "sms" = "email"
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // V produkciji: tu bi bil resničen SMTP/SMS klic
    // const info = await transporter.sendMail({ ... });
    // const info = await smsGateway.send({ ... });

    // Za demo: shranimo v NotificationLog tabelo
    // Ker NotificationLog model še ni v Prisma shemi, uporabimo console + localStorage-style log
    console.log(`[NOTIFICATION ${channel.toUpperCase()}] → ${payload.to || "(brez naslova)"}`);
    console.log(`  Subject: ${payload.subject}`);
    console.log(`  Type: ${payload.type}`);
    console.log(`  Body preview: ${payload.body.slice(0, 100)}...`);

    // V produkciji tu pride klic k SMTP/SMS gateway
    // Za potrebe demo samo simuliramo uspeh
    return { success: true, id: `notif_${Date.now()}` };
  } catch (e) {
    console.error("Notification error:", e);
    return { success: false, error: String(e) };
  }
}

// Helper: format EUR
function formatEUR(amount: number): string {
  return new Intl.NumberFormat("sl-SI", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}
