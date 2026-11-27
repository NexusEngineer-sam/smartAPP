"use client";

import { useState } from "react";
import { BellRing, BellOff, CheckCircle2, X, Smartphone, ShieldCheck } from "lucide-react";

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export default function PushNotifications() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState("default");

  async function inspect() {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setEnabled(Boolean(subscription));
    } catch { setEnabled(false); }
  }

  async function openSettings() {
    setOpen(true);
    setStatus("");
    await inspect();
  }

  async function enable() {
    setBusy(true);
    setStatus("");
    try {
      const keyResponse = await fetch("/api/push/vapid-public-key", { cache: "no-store" });
      const keyResult = await keyResponse.json();
      const key = keyResult.publicKey as string | undefined;
      if (!keyResponse.ok || !key) throw new Error("Push alerts bado hazijasanidiwa na msimamizi wa mfumo.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Browser hii haitumii push notifications. Tumia Chrome kwenye simu.");
      const resultPermission = await Notification.requestPermission();
      setPermission(resultPermission);
      if (resultPermission !== "granted") throw new Error("Ruhusu notifications kwenye mipangilio ya browser/simu.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key) as BufferSource });
      const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Imeshindikana kuhifadhi simu hii.");
      setEnabled(true);
      setStatus(result.pushConfigured ? "Simu imeunganishwa. Alert ya majaribio imetumwa." : "Usajili umehifadhiwa, lakini server inahitaji VAPID keys ili kutuma alerts.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Kuna hitilafu. Jaribu tena.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    setStatus("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setStatus("Alerts zimezimwa kwenye simu hii.");
    } catch { setStatus("Imeshindikana kuzima alerts. Jaribu tena."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" className="icon-btn notification-settings-trigger" onClick={openSettings} aria-label="Phone notification settings" title="Phone alert settings"><BellRing size={18}/></button>
    {open && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="modal-card notification-settings" role="dialog" aria-modal="true" aria-labelledby="notification-title">
        <div className="modal-heading"><div><span className="eyebrow">DEVICE PREFERENCES</span><h2 id="notification-title">Phone alert settings</h2></div><button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={19}/></button></div>
        <div className="notification-device"><span className="notification-device-icon"><Smartphone size={22}/></span><div><b>This phone</b><small>{typeof window !== "undefined" ? window.navigator.userAgent.includes("Android") ? "Android device" : "Current browser" : "Current device"}</small></div><span className={enabled ? "notification-state on" : "notification-state"}>{enabled ? "CONNECTED" : "NOT CONNECTED"}</span></div>
        <div className="notification-info"><ShieldCheck size={17}/><span>Allow SAMWEL CAMPUS OS to send timetable reminders, announcements and important campus alerts to this device.</span></div>
        <div className="notification-permission"><span>Browser permission</span><b>{permission === "granted" ? "Allowed" : permission === "denied" ? "Blocked in device settings" : "Not requested yet"}</b></div>
        {status && <p className={status.includes("imeunganishwa") || status.includes("zimezimwa") ? "success-message" : "form-error"} role="status">{status}</p>}
        {enabled ? <button type="button" className="primary-btn notification-disable" onClick={disable} disabled={busy}><BellOff size={15}/>{busy ? "Inabadilisha..." : "Zima alerts kwenye simu hii"}</button> : <button type="button" className="primary-btn" onClick={enable} disabled={busy}><BellRing size={15}/>{busy ? "Inaunganisha..." : "Washa phone alerts"}</button>}
        <small className="notification-footnote">Kumbuka: Ruhusa ya browser na VAPID server configuration lazima viwe tayari ili alerts zifike hata app ikiwa imefungwa.</small>
      </section>
    </div>}
  </>;
}
