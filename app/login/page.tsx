"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: mode === "register" ? name.trim() : email.split("@")[0] }),
      });
      const responseText = await response.text();
      let data: { error?: string } = {};
      try { data = responseText ? JSON.parse(responseText) as { error?: string } : {}; }
      catch { throw new Error("Server returned an invalid response. Please try again later."); }
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      router.replace("/"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-art">
      <div className="brand"><span className="brand-mark"><GraduationCap size={23}/></span><span>SAMWEL <b>CAMPUS OS</b></span></div>
      <div className="art-copy"><span className="eyebrow">THE UNIVERSITY, REIMAGINED</span><h1>Your campus.<br/><em>Your command.</em></h1><p>One intelligent space for learning, campus life and everything in between.</p></div>
      <div className="art-foot"><ShieldCheck size={16}/> Secure access · Built for students</div>
    </section>
    <section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}>
      <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span>
      <h2>{mode === "login" ? "Sign in to your campus" : "Create your student account"}</h2>
      <p className="muted">Use your email address and password to continue.</p>
      {mode === "register" && <label>Full name<input type="text" autoComplete="name" minLength={2} maxLength={80} required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>}
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@university.ac.tz"/></label>
      <label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Create account"}</button>
      <p className="switch-auth">{mode === "login" ? "New to Campus OS?" : "Already registered?"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setPassword("");setShowPassword(false);}}>{mode==="login"?"Create an account":"Sign in"}</button></p>
      <small className="fine-print">By continuing, you agree to use this platform responsibly and protect your account credentials.</small>
    </form></section>
  </main>;
}
