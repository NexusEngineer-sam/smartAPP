"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, ShieldCheck, Camera, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photoError, setPhotoError] = useState("");

  async function choosePhoto(file?: File) {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Chagua picha (JPG, PNG au WebP)."); return; }
    if (file.size > 8 * 1024 * 1024) { setPhotoError("Picha isiwe zaidi ya 8MB."); return; }
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
      });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source;
      });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Picha haikuweza kuchakatwa.");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.78);
      if (compressed.length > 680000) throw new Error("Picha ni kubwa. Chagua picha nyingine.");
      setAvatarUrl(compressed);
    } catch (err) { setPhotoError(err instanceof Error ? err.message : "Imeshindikana kusoma picha."); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/" + mode, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: mode === "register" ? name.trim() : email.split("@")[0], ...(mode === "register" && avatarUrl ? { avatarUrl } : {}) }),
      });
      const responseText = await response.text();
      let data: { error?: string } = {};
      try { data = responseText ? JSON.parse(responseText) as { error?: string } : {}; }
      catch { throw new Error("Server returned an invalid response. Please try again later."); }
      if (!response.ok) throw new Error(data.error || "Unable to continue.");
      router.replace(mode === "register" ? "/onboarding" : "/"); router.refresh();
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
      <h2>{mode === "login" ? "Sign in to your campus" : "Create your account"}</h2>
      <p className="muted">Anza kwa email na password. Taarifa za chuo utajaza baada ya kufungua account.</p>
      {mode === "register" && <>
        <label>Full name<input type="text" autoComplete="name" minLength={2} maxLength={80} required value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label>
        <div className="register-photo-row">
          <span className="register-photo-preview">{avatarUrl ? <img src={avatarUrl} alt="Profile preview"/> : <UserRound size={25}/>}</span>
          <div className="register-photo-copy"><b>Profile photo <small>OPTIONAL</small></b><span>Weka picha yako itakayoonekana kwenye profile na digital student ID.</span>
            <label className="photo-upload-btn"><Camera size={14}/> {avatarUrl ? "Badilisha picha" : "Chagua picha"}<input type="file" accept="image/*" onChange={e=>void choosePhoto(e.target.files?.[0])}/></label>
          </div>
        </div>
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
      </>}
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a strong password"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {mode === "login" && <p className="switch-auth"><a href="/forgot-password">Forgot password?</a></p>}
      <button className="primary-btn" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely" : "Continue"}</button>
      <p className="switch-auth">{mode === "login" ? "New to Campus OS?" : "Already registered?"} <button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setPassword("");setShowPassword(false);setAvatarUrl("");setPhotoError("");}}>{mode==="login"?"Create an account":"Sign in"}</button></p>
      <small className="fine-print">By continuing, you agree to use this platform responsibly and protect your account credentials.</small>
    </form></section>
  </main>;
}
