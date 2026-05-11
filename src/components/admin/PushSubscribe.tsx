"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "unsupported" | "ready" | "subscribed" | "denied";

export function PushSubscribe({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!vapidPublicKey) {
      setStatus("unsupported");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setStatus(existing ? "subscribed" : "ready");
      } catch (e) {
        console.error("[push] SW registration failed", e);
        setStatus("unsupported");
      }
    })();
  }, [vapidPublicKey]);

  async function subscribe() {
    if (!vapidPublicKey) return;
    setPending(true);
    setFeedback(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "ready");
        setFeedback("Berechtigung wurde nicht erteilt.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
            auth: arrayBufferToBase64(sub.getKey("auth")),
          },
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error("subscribe API " + res.status);

      setStatus("subscribed");
      setFeedback("✓ Aktiv. Du bekommst ab jetzt eine Nachricht bei jeder Online-Anmeldung.");
    } catch (e) {
      console.error("[push] subscribe", e);
      setFeedback("Fehler beim Aktivieren. Versuch's nochmal.");
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    setPending(true);
    setFeedback(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("ready");
      setFeedback("Push-Nachrichten deaktiviert.");
    } catch (e) {
      console.error("[push] unsubscribe", e);
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Test verschickt an ${data.sent} Gerät${data.sent === 1 ? "" : "e"}.`);
      } else {
        setFeedback("Test fehlgeschlagen.");
      }
    } catch (e) {
      setFeedback("Test fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking") {
    return null;
  }

  if (status === "unsupported") {
    return (
      <div className="border border-ink/15 p-5">
        <p className="label mb-2">Push-Nachrichten</p>
        <p className="text-sm text-muted leading-relaxed">
          {!vapidPublicKey
            ? "Push noch nicht konfiguriert. VAPID-Keys in den Render-ENV setzen — siehe Setup-Anleitung."
            : `Dieser Browser unterstützt keine Web-Push-Nachrichten. Auf dem iPhone: Seite über Safari öffnen und "Zum Home-Bildschirm" hinzufügen, dann von dort starten.`}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-ink/15 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="label">Push-Nachrichten aufs Handy</p>
        {status === "subscribed" && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green-700">
            ● aktiv
          </span>
        )}
      </div>

      {status === "denied" ? (
        <p className="text-sm text-muted leading-relaxed">
          Browser-Berechtigung wurde verweigert. In den Browser-Einstellungen unter „Benachrichtigungen"
          freigeben und Seite neu laden.
        </p>
      ) : status === "subscribed" ? (
        <>
          <p className="text-sm text-ink-soft leading-relaxed mb-4">
            Du bekommst bei jeder echten Online-Anmeldung eine Push-Nachricht auf dieses Gerät.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={sendTest}
              disabled={pending}
              className="border border-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/5 disabled:opacity-40"
            >
              Test-Nachricht senden
            </button>
            <button
              onClick={unsubscribe}
              disabled={pending}
              className="font-mono text-xs uppercase tracking-[0.14em] underline underline-offset-4 hover:text-red-700 disabled:opacity-40"
            >
              Deaktivieren
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft leading-relaxed mb-4">
            Lass dich bei jeder Online-Anmeldung sofort auf diesem Gerät benachrichtigen. Auf
            iPhone: Seite über Safari → „Zum Home-Bildschirm" hinzufügen und von dort starten.
          </p>
          <button
            onClick={subscribe}
            disabled={pending}
            className="bg-ink text-cream px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink/90 disabled:opacity-40"
          >
            {pending ? "Wird aktiviert …" : "Push-Nachrichten aktivieren"}
          </button>
        </>
      )}

      {feedback && (
        <p className="mt-3 font-mono text-[11px] text-muted">{feedback}</p>
      )}
    </div>
  );
}

// Hilfsfunktionen für Base64 ↔ Uint8Array (für VAPID-Key)
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
