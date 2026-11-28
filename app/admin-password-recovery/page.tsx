"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AdminPasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setDone("");
    if (password !== confirm) {
      setError("Password hazifanani.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/admin-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, recoveryKey, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Imeshindikana kuweka password.");
      setDone(data.message || "Password imebadilishwa.");
      setRecoveryKey("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-art">
        <div className="brand">SAMWEL <b>CAMPUS OS</b></div>
        <div className="art-copy">
          <span className="eyebrow">ADMIN ACCOUNT RECOVERY</span>
          <h1>Take back<br /><em>your control.</em></h1>
          <p>Set a fresh administrator password securely, without needing the old one or email delivery.</p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">SECURE ADMIN RESET</span>
          <h2>Set a new admin password</h2>
          <p className="muted">Tumia email ya admin na recovery key uliyopewa. Password iwe na angalau herufi 12.</p>
          <label>Admin email
            <input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@example.com" />
          </label>
          <label>Recovery key
            <input type="password" required minLength={32} autoComplete="off" value={recoveryKey} onChange={event => setRecoveryKey(event.target.value)} placeholder="Enter your one-time recovery key" />
          </label>
          <label>New password
            <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" />
          </label>
          <label>Confirm new password
            <input type="password" required minLength={12} maxLength={72} autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Repeat your new password" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {done && <p role="status">{done}</p>}
          <button className="primary-btn" disabled={busy}>{busy ? "Updating…" : "Set new password"}</button>
          <p className="switch-auth"><Link href="/login">Back to sign in</Link></p>
        </form>
      </section>
    </main>
  );
}
