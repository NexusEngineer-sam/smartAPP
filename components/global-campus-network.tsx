"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Globe2, Search, Users, Plus, Languages, MapPin, ArrowUpRight, LoaderCircle, X, MessageSquareText, Send } from "lucide-react";

type CommunityPost = { id:string; body:string; createdAt:string; authorId:string; authorName:string; authorAvatar?:string|null };
type CommunityMessage = CommunityPost;
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
  const [selected, setSelected] = useState<Community | null>(null);
  const [spaceTab, setSpaceTab] = useState<"discussion"|"chat">("discussion");
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [spaceDraft, setSpaceDraft] = useState("");
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceSending, setSpaceSending] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [matchProfile, setMatchProfile] = useState({ country: "", bio: "", skills: "", interests: "", lookingFor: "Study partner" });
  const [matches, setMatches] = useState<Array<{id:string;name:string;avatarUrl:string|null;university:string|null;course:string|null;country:string;bio:string;skills:string[];interests:string[];lookingFor:string;score:number}>>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchMessage, setMatchMessage] = useState("");

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

  const loadMatches = useCallback(async () => {
    setMatchLoading(true); setMatchMessage("");
    try {
      const response = await fetch("/api/global-network/matches", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load student matches.");
      setMatchProfile({ country: data.profile?.country === "Not specified" ? "" : (data.profile?.country || ""), bio: data.profile?.bio || "", skills: (data.profile?.skills || []).join(", "), interests: (data.profile?.interests || []).join(", "), lookingFor: data.profile?.lookingFor || "Study partner" });
      setMatches(data.matches || []);
    } catch (e) { setMatchMessage(e instanceof Error ? e.message : "Matching unavailable."); }
    finally { setMatchLoading(false); }
  }, []);

  useEffect(() => { void loadMatches(); }, [loadMatches]);

  async function saveMatchProfile(e: React.FormEvent) {
    e.preventDefault(); setMatchSaving(true); setMatchMessage("");
    try {
      const response = await fetch("/api/global-network/matches", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...matchProfile, skills: matchProfile.skills.split(",").map(x=>x.trim()).filter(Boolean), interests: matchProfile.interests.split(",").map(x=>x.trim()).filter(Boolean) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your matching profile.");
      setMatches(data.matches || []); setMatchMessage("Profile saved. Your matches have been refreshed.");
    } catch (e) { setMatchMessage(e instanceof Error ? e.message : "Could not save profile."); }
    finally { setMatchSaving(false); }
  }

  const loadSpace = useCallback(async (community: Community, tab: "discussion"|"chat") => {
    setSpaceLoading(true);
    try {
      const endpoint = tab === "discussion" ? "posts" : "chat";
      const response = await fetch(`/api/global-network/communities/${community.id}/${endpoint}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load community space.");
      if (tab === "discussion") setCommunityPosts(data.posts || []);
      else setCommunityMessages(data.messages || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Community space unavailable."); }
    finally { setSpaceLoading(false); }
  }, []);

  useEffect(() => {
    if (!selected) return;
    void loadSpace(selected, spaceTab);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadSpace(selected, spaceTab);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [selected, spaceTab, loadSpace]);

  async function sendToSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !spaceDraft.trim() || spaceSending) return;
    setSpaceSending(true); setError("");
    try {
      const endpoint = spaceTab === "discussion" ? "posts" : "chat";
      const response = await fetch(`/api/global-network/communities/${selected.id}/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: spaceDraft.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message could not be sent.");
      if (spaceTab === "discussion") setCommunityPosts(v => [data.post, ...v]);
      else setCommunityMessages(v => [...v, data.message]);
      setSpaceDraft("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send."); }
    finally { setSpaceSending(false); }
  }

  function translateText(value: string) {
    const url = "https://translate.google.com/?sl=auto&tl=" + encodeURIComponent(targetLanguage) + "&text=" + encodeURIComponent(value) + "&op=translate";
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <section className="global-network">
    <div className="global-network-hero">
      <div className="global-network-orbit"><Globe2 size={34}/></div>
      <div className="global-network-hero-copy"><span className="eyebrow">ONE WORLD · MANY CAMPUSES</span><h2>Global Campus Network</h2><p>Meet students, exchange knowledge and build projects across borders.</p></div>
      <div className="global-network-hero-stats"><div><b>{items.length}</b><span>Communities shown</span></div><div><b>{joinedCount}</b><span>Joined here</span></div></div>
    </div>
    <section className="global-match-panel">
      <div className="global-match-heading"><div><span className="eyebrow">MEET YOUR NEXT COLLABORATOR</span><h3>Smart Student Match</h3><p>Find study partners, project teammates and skill-exchange friends across campuses.</p></div><span className="global-match-count">{matches.length} matches</span></div>
      <form className="global-match-form" onSubmit={saveMatchProfile}>
        <label>Country<input maxLength={80} value={matchProfile.country} onChange={e=>setMatchProfile({...matchProfile,country:e.target.value})} placeholder="e.g. Tanzania"/></label>
        <label>Skills <small>comma separated</small><input maxLength={500} value={matchProfile.skills} onChange={e=>setMatchProfile({...matchProfile,skills:e.target.value})} placeholder="Python, UI design, research"/></label>
        <label>Interests <small>comma separated</small><input maxLength={500} value={matchProfile.interests} onChange={e=>setMatchProfile({...matchProfile,interests:e.target.value})} placeholder="AI, cybersecurity, startups"/></label>
        <label>Looking for<select value={matchProfile.lookingFor} onChange={e=>setMatchProfile({...matchProfile,lookingFor:e.target.value})}><option>Study partner</option><option>Project partner</option><option>Research collaborator</option><option>Skill exchange</option><option>Startup co-founder</option><option>Mentor</option></select></label>
        <label className="global-match-bio">Short introduction<textarea maxLength={500} value={matchProfile.bio} onChange={e=>setMatchProfile({...matchProfile,bio:e.target.value})} placeholder="Tell other students what you are learning or building…"/></label>
        <button className="global-match-save" disabled={matchSaving}>{matchSaving?"Saving…":"Save profile & find matches"}</button>
      </form>
      {matchMessage && <p className="global-network-error">{matchMessage}</p>}
      {matchLoading ? <div className="global-network-empty">Finding collaborators…</div> : <div className="global-match-results">{matches.map(person=><article className="global-match-card" key={person.id}><div className="global-match-person">{person.avatarUrl?<img src={person.avatarUrl} alt=""/>:<span>{person.name.slice(0,1).toUpperCase()}</span>}<div><b>{person.name}</b><small>{[person.course,person.university,person.country].filter(Boolean).join(" · ")}</small></div><strong>{person.score}% match</strong></div><p>{person.bio || "Student open to connecting and sharing knowledge."}</p><div className="global-match-tags">{person.skills.slice(0,4).map(s=><span key={s}>{s}</span>)}{person.interests.slice(0,3).map(s=><span key={s}>{s}</span>)}</div><small>Looking for: {person.lookingFor}</small></article>)}</div>}
    </section>
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
        <div className="global-community-actions">{item.joined && <button className="global-community-space" onClick={() => { setSelected(item); setSpaceTab("discussion"); setError(""); }}><MessageSquareText size={15}/> Open space</button>}<button className={item.joined ? "global-community-joined" : "global-community-join"} disabled={busy === item.id} onClick={() => void toggleJoin(item)}>{busy === item.id ? "Please wait…" : item.joined ? "Leave" : "Join community"} <ArrowUpRight size={15}/></button></div>
      </article>)}</div>}
    {selected && <div className="global-network-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><section className="global-network-space">
      <header className="global-network-space-head"><div><span className="eyebrow">CROSS-CAMPUS COMMUNITY</span><h3>{selected.name}</h3><p>{selected.country}{selected.university ? " · " + selected.university : ""}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close"><X size={20}/></button></header>
      <div className="global-network-space-tools"><div className="global-network-tabs"><button className={spaceTab==="discussion"?"active":""} onClick={() => setSpaceTab("discussion")}><MessageSquareText size={15}/> Discussions</button><button className={spaceTab==="chat"?"active":""} onClick={() => setSpaceTab("chat")}><Users size={15}/> Live chat</button></div><label className="global-network-language"><Languages size={15}/><select value={targetLanguage} onChange={e=>setTargetLanguage(e.target.value)}><option value="en">English</option><option value="sw">Kiswahili</option><option value="fr">Français</option><option value="es">Español</option><option value="pt">Português</option><option value="ar">العربية</option><option value="ja">日本語</option><option value="zh-CN">中文</option></select></label></div>
      <div className="global-network-space-feed">{spaceLoading && <div className="global-network-empty"><LoaderCircle size={20}/> Loading…</div>}
        {!spaceLoading && (spaceTab==="discussion"?communityPosts:communityMessages).length===0 && <div className="global-network-empty"><Globe2 size={25}/><b>Start the international conversation</b><span>Share a question, idea or useful resource with members.</span></div>}
        {(spaceTab==="discussion"?communityPosts:communityMessages).map(post=><article className="global-space-post" key={post.id}><div className="global-space-author"><span>{post.authorAvatar?<img src={post.authorAvatar} alt=""/>:post.authorName.slice(0,1).toUpperCase()}</span><div><b>{post.authorName}</b><small>{new Date(post.createdAt).toLocaleString()}</small></div></div><p>{post.body}</p><button onClick={()=>translateText(post.body)}><Languages size={14}/> Translate</button></article>)}
      </div>
      <form className="global-network-space-compose" onSubmit={sendToSpace}><textarea value={spaceDraft} onChange={e=>setSpaceDraft(e.target.value)} maxLength={2000} placeholder={spaceTab==="discussion"?"Share an idea or ask the global community…":"Write a message to community members…"} /><button disabled={spaceSending||!spaceDraft.trim()}><Send size={16}/>{spaceSending?"Sending…":spaceTab==="discussion"?"Publish":"Send"}</button></form>
      <p className="global-network-translation-note"><Languages size={13}/> Translate opens Google Translate in a new tab; it does not alter the original message.</p>
    </section></div>}
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
