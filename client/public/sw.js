// Virtus Portal - Service Worker for Web Push & Offline Support

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Alerta de mercado acionado no Virtus Portal.",
      icon: data.icon || "/brand/favicon.png",
      badge: "/brand/favicon.png",
      tag: data.tag || "virtus-alert",
      data: data.data || {},
      vibrate: [200, 100, 200],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Virtus Portal", options)
    );
  } catch (err) {
    // Fallback if payload is plain text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Virtus Portal", {
        body: text,
        icon: "/brand/favicon.png",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = "/alerts";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/alerts") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
