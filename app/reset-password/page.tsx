"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") || ""); }, []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Password hazifanani."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Imeshindikana kubadilisha password.");
      setDone(true);
      setTimeout(() => router.replace("/login"), 1800);
    } catch (err) { setError(err instanceof Error ? err.message : "Jaribu tena."); }
    finally { setBusy(false); }
  }
  return <main className="auth-shell"><section className="auth-art"><div className="brand">SAMWEL <b>CAMPUS OS</b></div><div className="art-copy"><span className="eyebrow">SECURE ACCOUNT</span><h1>Choose a<br/><em>new password.</em></h1><p>Your new password protects your campus account.</p></div></section><section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><span className="eyebrow">RESET PASSWORD</span><h2>Create a new password</h2>{done ? <p role="status">Password imebadilishwa. Tunakurudisha kwenye login…</p> : <>{!token && <p className="form-error">Reset link haipo. Omba link mpya.</p>}<p className="muted">Tumia angalau herufi 10.</p><label>New password<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label><label>Confirm new password<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-btn" disabled={busy || !token}>{busy ? "Updating…" : "Update password"}</button></>}<p className="switch-auth"><Link href="/login">Back to sign in</Link></p></form></section></main>;
}
