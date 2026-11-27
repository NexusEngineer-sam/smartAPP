"use client";

import { useState } from "react";
import { BellRing } from "lucide-react";

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PushNotifications() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    setStatus("");
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("Push service haijawekwa na msimamizi bado.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Simu au browser hii haitumii push notifications.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Ruhusa ya notifications haijaruhusiwa kwenye simu.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key) as BufferSource });
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Imeshindikana kuhifadhi simu hii.");
      setStatus(result.pushConfigured ? "Imeunganishwa! Angalia simu yako kwa alert ya majaribio." : "Usajili umehifadhiwa, lakini msimamizi bado hajaweka VAPID keys kwenye server.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kuna hitilafu. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="push-setup">
    <button type="button" className="text-action" onClick={enable} disabled={busy}><BellRing size={16}/>{busy ? "Inaunganisha..." : "Enable phone alerts"}</button>
    {status && <small role="status">{status}</small>}
  </div>;
}
