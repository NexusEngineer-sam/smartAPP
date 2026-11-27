"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Imeshindikana kutuma ombi.");
      setMessage(data.message || "Kama akaunti ipo, utatumwa link ya kubadilisha password.");
    } catch (err) { setError(err instanceof Error ? err.message : "Jaribu tena."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-art"><div className="brand">SAMWEL <b>CAMPUS OS</b></div><div className="art-copy"><span className="eyebrow">ACCOUNT RECOVERY</span><h1>Get back<br/><em>to campus.</em></h1><p>We will send a secure, one-time password reset link to your email.</p></div></section><section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">PASSWORD RECOVERY</span><h2>Forgot your password?</h2><p className="muted">Enter the email address registered to your account.</p><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@university.ac.tz"/></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}<button className="primary-btn" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button><p className="switch-auth"><Link href="/login">Back to sign in</Link></p></form></section></main>;
}
