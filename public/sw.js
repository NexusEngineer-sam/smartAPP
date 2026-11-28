self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || "NEXUS";
  const options = {
    body: data.body || "You have a new NEXUS alert.",
    icon: "/icons/campus-icon.svg",
    badge: "/icons/campus-icon.svg",
    tag: data.tag || "nexus-alert",
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [400, 150, 400, 150, 700],
    timestamp: Date.now(),
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
