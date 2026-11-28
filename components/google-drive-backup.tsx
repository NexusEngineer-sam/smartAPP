"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudUpload, HardDrive, ShieldCheck, RefreshCw, Unplug } from "lucide-react";

type Status = { connected: boolean; connection: { googleEmail: string | null; frequency: string; lastBackupAt: string | null; nextBackupAt: string | null } | null };
export default function GoogleDriveBackupCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [frequency, setFrequency] = useState("WEEKLY");
  async function refresh() {
    try {
      const response = await fetch("/api/account/backup", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Imeshindikana kupata hali ya backup.");
      setStatus(data);
      if (data.connection?.frequency) setFrequency(data.connection.frequency);
    } catch (e) { setError(e instanceof Error ? e.message : "Imeshindikana kupakia backup."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); const params = new URLSearchParams(window.location.search); const drive = params.get("drive"); if (drive) { const messages: Record<string,string> = { connected: "Google Drive imeunganishwa kikamilifu.", cancelled: "Umeghairi kuunganisha Google Drive.", not_configured: "Google OAuth haijawekwa kwenye server bado.", refresh_token_missing: "Google haikutoa ruhusa ya refresh token. Ondoa ruhusa ya app kwenye Google Account kisha unganisha tena." }; if (messages[drive]) setMessage(messages[drive]); else setError("Kuunganisha Google Drive hakukukamilika. Jaribu tena."); window.history.replaceState({}, "", "/account"); } }, []);
  async function backup() {
    setBusy(true); setError(""); setMessage("");
    try { const r = await fetch("/api/account/backup", { method: "POST" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Backup imeshindikana."); setMessage(`Backup imehifadhiwa Google Drive: ${d.fileName}`); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Backup imeshindikana."); }
    finally { setBusy(false); }
  }
  async function saveFrequency(value: string) {
    setFrequency(value); setError(""); setMessage("");
    try { const r = await fetch("/api/account/backup", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frequency: value }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Imeshindikana kuhifadhi ratiba."); setMessage("Ratiba ya backup imehifadhiwa. Automatic backup itaanza baada ya scheduler ya server kuwashwa."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Jaribu tena."); }
  }
  async function disconnect() {
    if (!window.confirm("Unataka kuondoa muunganisho wa Google Drive? Backup zilizopo Drive hazitafutwa.")) return;
    setBusy(true); setError(""); setMessage("");
    try { const r = await fetch("/api/account/backup/disconnect", { method: "POST" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Imeshindikana."); setStatus({ connected: false, connection: null }); setMessage("Google Drive imetenganishwa. Backup zako zilizopo hazijafutwa."); }
    catch (e) { setError(e instanceof Error ? e.message : "Jaribu tena."); }
    finally { setBusy(false); }
  }
  const card: React.CSSProperties = { background: "linear-gradient(135deg,#15152b,#242044)", color: "#fff", borderRadius: 20, padding: 24, margin: "18px 0", boxShadow: "0 15px 40px #211a4b18" };
  const button: React.CSSProperties = { border: 0, borderRadius: 11, padding: "12px 15px", background: "linear-gradient(100deg,#8063f5,#5e45d8)", color: "#fff", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" };
  return <section style={card}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 42, height: 42, borderRadius: 13, background: "#ffffff18", display: "grid", placeItems: "center" }}><Cloud size={22}/></span><div><div style={{ fontSize: 9, letterSpacing: 1.5, color: "#b9aaff", fontWeight: 800 }}>SAMWEL ACCOUNT VAULT</div><h2 style={{ fontSize: 19, margin: "4px 0" }}>Google Drive Backup</h2></div></div>
      <span style={{ fontSize: 10, borderRadius: 20, padding: "7px 10px", background: status?.connected ? "#164b3e" : "#ffffff18", color: status?.connected ? "#8df0cb" : "#d5d1e8" }}>{loading ? "Checking..." : status?.connected ? "Connected" : "Not connected"}</span>
    </div>
    <p style={{ color: "#c1bdd4", fontSize: 11, lineHeight: 1.7, margin: "16px 0" }}>Hifadhi taarifa za akaunti yako kwenye Google Drive yako binafsi. Backup inajumuisha profile, posts zako, ratiba, matumizi na taarifa nyingine zinazomilikiwa na akaunti yako.</p>
    {status?.connected ? <div style={{ background: "#ffffff10", border: "1px solid #ffffff16", borderRadius: 13, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700 }}><HardDrive size={16}/> {status.connection?.googleEmail || "Google account connected"}</div>
      <div style={{ color: "#aaa5c5", fontSize: 10, marginTop: 8 }}>Last backup: {status.connection?.lastBackupAt ? new Date(status.connection.lastBackupAt).toLocaleString() : "Bado haijafanyika"}</div>
      <label style={{ display: "block", marginTop: 14, fontSize: 10, color: "#d0cce1" }}>Backup frequency</label>
      <select value={frequency} onChange={e => void saveFrequency(e.target.value)} style={{ width: "100%", marginTop: 7, borderRadius: 9, padding: 11, background: "#302b4d", border: "1px solid #51496f", color: "#fff", fontSize: 12 }}>
        <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
      </select>
      <p style={{ color: "#a9a4c0", fontSize: 9, lineHeight: 1.6, marginBottom: 0 }}>Ratiba imehifadhiwa; automatic backup itawashwa baada ya scheduler ya server kusanidiwa.</p>
    </div> : <div style={{ background: "#ffffff10", borderRadius: 12, padding: 13, color: "#d2cee2", fontSize: 10, marginBottom: 14 }}>Unganisha Google Drive ili CAMPUS OS iweze kuhifadhi backup kwenye eneo lake salama la app ndani ya Drive yako.</div>}
    {error && <p style={{ color: "#ffb6bd", fontSize: 11 }}>{error}</p>}{message && <p style={{ color: "#8df0cb", fontSize: 11 }}>{message}</p>}
    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
      {status?.connected ? <><button type="button" style={button} disabled={busy} onClick={() => void backup()}><CloudUpload size={15}/>{busy ? "Inahifadhi..." : "Back Up Now"}</button><button type="button" style={{ ...button, background: "#ffffff16" }} disabled={busy} onClick={() => void disconnect()}><Unplug size={15}/> Disconnect</button></> : <button type="button" style={button} disabled={loading} onClick={() => { window.location.href = "/api/account/backup/connect"; }}><Cloud size={15}/> Connect Google Drive</button>}
      <button type="button" aria-label="Refresh backup status" style={{ ...button, background: "#ffffff16" }} disabled={busy || loading} onClick={() => void refresh()}><RefreshCw size={14}/></button>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#aaa5c5", fontSize: 9, marginTop: 16 }}><ShieldCheck size={13}/> Tokens zimehifadhiwa kwa encryption. Password na session za kuingia hazijumuishwi.</div>
    <p style={{ color: "#9e99b7", fontSize: 9, lineHeight: 1.6, marginBottom: 0 }}>Picha na video zenyewe hazijawekwa ndani ya backup hii; inahifadhi metadata na media links. Restore/import bado haijawashwa.</p>
  </section>;
}
