"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CreditCard, RefreshCw, ShieldCheck, X } from "lucide-react";

type Props = { user: { name: string; email: string; role: string } };
type Pass = { token: string; expiresAt: string; identity: { name: string; role: string } };

export default function DigitalId({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState<Pass | null>(null);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  async function refreshPass() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/identity", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create your campus pass.");
      const nextPass = data as Pass;
      const verifyUrl = new URL("/verify", window.location.origin);
      verifyUrl.searchParams.set("token", nextPass.token);
      const image = await QRCode.toDataURL(verifyUrl.toString(), { width: 280, margin: 2, errorCorrectionLevel: "M" });
      setPass(nextPass);
      setQr(image);
      setSeconds(90);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your campus pass.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || !pass) return;
    const timer = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [open, pass]);

  useEffect(() => {
    if (open && !pass) void refreshPass();
  }, [open]);

  return <>
    <button className="text-action digital-id-trigger" onClick={() => setOpen(true)}><CreditCard size={15}/> View digital student ID</button>
    {open && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="digital-id-modal" role="dialog" aria-modal="true" aria-labelledby="digital-id-title">
        <div className="digital-id-heading"><div><span className="eyebrow">SECURE CAMPUS IDENTITY</span><h2 id="digital-id-title">Digital campus ID</h2></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={19}/></button></div>
        <div className="digital-id-card">
          <div className="digital-id-card-top"><span className="digital-id-emblem"><CreditCard size={19}/></span><span>SAMWEL CAMPUS OS<small>OFFICIAL DIGITAL ID</small></span></div>
          <div className="digital-id-person"><div className="digital-id-avatar">{user.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}</div><div><b>{user.name}</b><small>{user.role.replaceAll("_", " ")}</small></div></div>
          <div className="digital-id-email">{user.email}</div>
          <div className="digital-id-footer"><span><ShieldCheck size={13}/> Protected identity</span><span>LIVE QR PASS</span></div>
        </div>
        <div className="digital-id-qr-area">
          {busy ? <div className="digital-id-qr-placeholder">Creating secure QR pass…</div> : qr && seconds > 0 ? <img src={qr} alt="One-time campus identity QR code"/> : <div className="digital-id-qr-placeholder">QR pass expired. Generate a new one.</div>}
          <div className="digital-id-qr-info"><b>{seconds > 0 ? "Ready for verification" : "Pass not active"}</b><small>{seconds > 0 ? `Expires in ${seconds}s · One scan only` : "Generate a fresh QR before presenting your ID."}</small></div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn digital-id-refresh" onClick={refreshPass} disabled={busy}><RefreshCw size={15}/>{busy ? "Generating…" : "Generate fresh QR pass"}</button>
        <p className="digital-id-note">The QR is short-lived and can be verified once. Do not share screenshots of your pass.</p>
      </section>
    </div>}
  </>;
}
