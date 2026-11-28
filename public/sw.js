const BADGE_DB = "nexus-app-badge";
const BADGE_STORE = "counts";

function updateStoredBadge(increment = 0) {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(BADGE_DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(BADGE_STORE);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(BADGE_STORE, "readwrite");
        const store = tx.objectStore(BADGE_STORE);
        const get = store.get("unread");
        get.onsuccess = () => {
          const count = Math.max(0, Number(get.result || 0) + increment);
          store.put(count, "unread");
          resolve(count);
        };
        tx.oncomplete = () => db.close();
        tx.onerror = () => { db.close(); resolve(1); };
      };
      request.onerror = () => resolve(1);
    } catch { resolve(1); }
  });
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_APP_BADGE") {
    const count = Math.max(0, Number(event.data.count || 0));
    event.waitUntil?.(Promise.resolve());
    if (count > 0 && self.navigator.setAppBadge) void self.navigator.setAppBadge(count);
    else if (self.navigator.clearAppBadge) void self.navigator.clearAppBadge();
    void updateStoredBadge(0).then(() => {
      const request = indexedDB.open(BADGE_DB, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(BADGE_STORE, "readwrite");
        tx.objectStore(BADGE_STORE).put(count, "unread");
        tx.oncomplete = () => db.close();
      };
    });
  }
});

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

  event.waitUntil((async () => {
    const count = await updateStoredBadge(1);
    if (self.navigator.setAppBadge) await self.navigator.setAppBadge(count).catch(() => undefined);
    await self.registration.showNotification(title, options);
  })());
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
