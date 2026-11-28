"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, Search, Users, Plus, Languages, MapPin, ArrowUpRight, LoaderCircle, X } from "lucide-react";

type Community = {
  id: string; name: string; country: string; university: string | null; category: string;
  description: string; language: string; memberCount: number; joined: boolean;
};
const categories = ["All", "Technology", "Research", "Entrepreneurship", "Opportunities", "Study", "Creative", "General"];

export default function GlobalCampusNetwork() {
  const [items, setItems] = useState<Community[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", university: "", category: "General", description: "", language: "English" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (category !== "All") params.set("category", category);
      const response = await fetch(`/api/global-network/communities?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load global communities.");
      setItems(data.communities);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load communities."); }
    finally { setLoading(false); }
  }, [query, category]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  async function toggleJoin(item: Community) {
    setBusy(item.id); setError("");
    try {
      const response = await fetch(`/api/global-network/communities/${item.id}/join`, { method: item.joined ? "DELETE" : "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update membership.");
      setItems(current => current.map(c => c.id === item.id ? { ...c, joined: !item.joined, memberCount: Math.max(0, c.memberCount + (item.joined ? -1 : 1)) } : c));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update membership."); }
    finally { setBusy(""); }
  }

  async function createCommunity(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/global-network/communities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create community.");
      setItems(current => [data.community, ...current]); setShowCreate(false);
      setForm({ name: "", country: "", university: "", category: "General", description: "", language: "English" });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create community."); }
    finally { setSaving(false); }
  }

  const joinedCount = useMemo(() => items.filter(x => x.joined).length, [items]);

  return <section className="global-network">
    <div className="global-network-hero">
      <div className="global-network-orbit"><Globe2 size={34}/></div>
      <div className="global-network-hero-copy"><span className="eyebrow">ONE WORLD · MANY CAMPUSES</span><h2>Global Campus Network</h2><p>Meet students, exchange knowledge and build projects across borders.</p></div>
      <div className="global-network-hero-stats"><div><b>{items.length}</b><span>Communities shown</span></div><div><b>{joinedCount}</b><span>Joined here</span></div></div>
    </div>
    <div className="global-network-toolbar">
      <label className="global-network-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics, countries or universities…"/></label>
      <button className="global-network-create" onClick={() => setShowCreate(true)}><Plus size={17}/> Create community</button>
    </div>
    <div className="global-network-categories">{categories.map(c => <button key={c} className={category === c ? "selected" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>
    {error && <p className="global-network-error">{error}</p>}
    {loading ? <div className="global-network-empty"><LoaderCircle className="spin" size={22}/> Loading communities…</div> : items.length === 0 ? <div className="global-network-empty"><Globe2 size={28}/><b>No communities match your search</b><span>Try another keyword or create the first community for your campus.</span></div> :
      <div className="global-network-grid">{items.map(item => <article className="global-community-card" key={item.id}>
        <div className="global-community-card-top"><span className="global-community-symbol"><Globe2 size={20}/></span><span className="global-community-category">{item.category}</span></div>
        <h3>{item.name}</h3><p>{item.description}</p>
        <div className="global-community-meta"><span><MapPin size={14}/>{item.country}</span>{item.university && <span>{item.university}</span>}</div>
        <div className="global-community-footer"><span><Users size={15}/>{item.memberCount.toLocaleString()} members</span><span><Languages size={14}/>{item.language}</span></div>
        <button className={item.joined ? "global-community-joined" : "global-community-join"} disabled={busy === item.id} onClick={() => void toggleJoin(item)}>{busy === item.id ? "Please wait…" : item.joined ? "Joined · Leave" : "Join community"} <ArrowUpRight size={15}/></button>
      </article>)}</div>}
    {showCreate && <div className="global-network-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreate(false); }}><form className="global-network-modal" onSubmit={createCommunity}>
      <div className="global-network-modal-heading"><div><span className="eyebrow">GROW THE NETWORK</span><h3>Create a global community</h3></div><button type="button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={19}/></button></div>
      <label>Community name<input required minLength={3} maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. African AI Researchers"/></label>
      <label>Country<input required maxLength={80} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. Tanzania"/></label>
      <label>University (optional)<input maxLength={140} value={form.university} onChange={e => setForm({ ...form, university: e.target.value })} placeholder="Your university"/></label>
      <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{categories.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Language<input required maxLength={40} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}/></label>
      <label>Description<textarea required minLength={15} maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What will members learn or build together?"/></label>
      <button className="global-network-submit" disabled={saving}>{saving ? "Creating…" : "Create community"}</button>
    </form></div>}
  </section>;
}
