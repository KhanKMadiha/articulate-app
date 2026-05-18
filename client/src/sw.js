import { precacheAndRoute } from "workbox-precaching";

// Injected by vite-plugin-pwa at build time
precacheAndRoute(self.__WB_MANIFEST);

// Handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Articulate";
  const options = {
    body: data.body || "Time for your daily reading practice.",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: "daily-reminder",
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap notification → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        const existing = list.find((c) => c.url.includes(self.location.origin));
        if (existing) return existing.focus();
        return clients.openWindow("/");
      })
  );
});
