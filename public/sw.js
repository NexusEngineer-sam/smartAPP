self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || "SAMWEL CAMPUS OS";
  const options = {
    body: data.body || "You have a new campus update.",
    icon: "/icons/campus-icon.svg",
    badge: "/icons/campus-icon.svg",
    tag: data.tag || "campus-os",
    renotify: true,
    vibrate: [200, 100, 200],
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
