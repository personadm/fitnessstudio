// Service Worker für Web Push.
// Wird vom Browser geladen von /sw.js
// Liefert Push-Nachrichten an das Betriebssystem aus.

self.addEventListener("install", (event) => {
  // Sofort aktivieren ohne auf Reload zu warten
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Sofort die Kontrolle über alle Tabs übernehmen
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Neue Aktivität", body: "", url: "/admin", tag: undefined };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 80, 200],
    data: { url: payload.url || "/admin" },
    tag: payload.tag,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Wenn schon ein Tab offen ist mit unserer Origin: fokussieren
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sonst neuen Tab öffnen
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
