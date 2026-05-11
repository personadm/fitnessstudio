// Web Push via Service Worker.
// Benötigt npm-Paket "web-push" + VAPID-Keys in den ENV.
// Wenn VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlen → silent skip.

import { db } from "@/lib/db";

let configured: boolean | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any = null;

async function init() {
  if (configured !== null) return configured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }

  try {
    // dynamic import vermeidet build-Fehler wenn das Paket fehlt
    webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch (e) {
    console.error("[push] web-push package nicht installiert?", e);
    configured = false;
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Push an alle gespeicherten Subscriptions senden.
 * Tot-Subscriptions (410 Gone) werden automatisch gelöscht.
 */
export async function sendPushToAll(payload: PushPayload) {
  const ok = await init();
  if (!ok) return { sent: 0, removed: 0 };

  const subs = await db.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, removed: 0 };

  let sent = 0;
  let removed = 0;
  const toDelete: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        sent++;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          toDelete.push(sub.id);
        } else {
          console.error("[push] sendNotification failed", err);
        }
      }
    }),
  );

  if (toDelete.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: toDelete } } });
    removed = toDelete.length;
  }

  return { sent, removed };
}

/**
 * Wrapper für „echte" Online-Anmeldung. Title/body bewusst kurz für die
 * Notification-Bubble auf dem Handy.
 */
export async function notifyOnlineSignup(opts: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  planName: string | null;
  contactId: string;
}) {
  const fullName = [opts.firstName, opts.lastName].filter(Boolean).join(" ").trim();
  const displayName = fullName || opts.email;
  const subline = opts.planName ? `Tarif: ${opts.planName}` : opts.email;

  return sendPushToAll({
    title: "🎉 Neue Online-Anmeldung",
    body: `${displayName} · ${subline}`,
    url: `/admin/contacts/${opts.contactId}`,
    tag: `signup-${opts.contactId}`,
  });
}
