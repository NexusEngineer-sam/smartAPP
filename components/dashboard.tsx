"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Bell, BookOpen, CalendarDays, ChevronRight, CircleHelp, GraduationCap, LayoutDashboard, LogOut, Plus, Shield, Wallet, X, ArrowUpRight, Clock3, Sparkles } from "lucide-react";

type User = { name: string; email: string; role: string };
type Expense = { id: string; title: string; category: string; amount: number; createdAt: string };
type Notice = { id: string; title: string; body: string; createdAt: string };
type ClassEvent = { id:string; title:string; courseCode:string|null; location:string|null; startsAt:string; endsAt:string; reminderMins:number };

const money = (n:number) => new Intl.NumberFormat("en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(n);

export default function Dashboard({user}:{user:User}) {
  const router=useRouter();
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [notices,setNotices]=useState<Notice[]>([]);
  const [classes,setClasses]=useState<ClassEvent[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [title,setTitle]=useState("");
  const [amount,setAmount]=useState("");
  const [category,setCategory]=useState("Food");
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);

  async function load() {
    setLoading(true);
    try {
      const [e,n,t]=await Promise.all([fetch("/api/expenses",{cache:"no-store"}),fetch("/api/announcements",{cache:"no-store"}),fetch("/api/timetable",{cache:"no-store"})]);
      if(e.status===401){router.replace("/login");return;}
      if(e.ok){const d=await e.json();setExpenses(d.expenses);}
      if(n.ok){const d=await n.json();setNotices(d.announcements);}
      if(t.ok){const d=await t.json();setClasses(d.events);}
    } finally {setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  const spent=useMemo(()=>expenses.reduce((s,x)=>s+x.amount,0),[expenses]);
  const greeting=new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening";
  async function addExpense(e:React.FormEvent){
    e.preventDefault();setError("");setSaving(true);
    try{
      const r=await fetch("/api/expenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,amount:Number(amount),category})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save expense.");
      setExpenses(x=>[d.expense,...x]);setTitle("");setAmount("");setModal(false);
    }catch(err){setError(err instanceof Error?err.message:"Could not save.");}finally{setSaving(false);}
  }
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");router.refresh();}
  const initials=user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand side-brand"><span className="brand-mark"><GraduationCap size={22}/></span><span>SAMWEL <b>CAMPUS OS</b></span></div>
      <span className="side-label">WORKSPACE</span><a className="nav-item active" href="/"><LayoutDashboard size={18}/> Overview</a><a className="nav-item" href="#planner"><CalendarDays size={18}/> Study planner</a><a className="nav-item" href="#finance"><Wallet size={18}/> My finances</a><a className="nav-item" href="#updates"><Bell size={18}/> Campus updates</a>
      {user.role==="ADMIN"&&<><span className="side-label">ADMINISTRATION</span><a className="nav-item" href="/admin"><Shield size={18}/> Control center</a></>}
      <div className="sidebar-bottom"><div className="support-link"><CircleHelp size={17}/> Help & support</div><div className="user-chip"><span className="avatar">{initials}</span><span className="user-meta"><b>{user.name}</b><small>{user.role.toLowerCase()}</small></span><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="mobile-brand"><GraduationCap/> CAMPUS OS</div><div className="topbar-right"><span className="campus-pill"><i/> UDOM · CAMPUS</span><a className="icon-btn" href="#updates" aria-label="Go to campus announcements"><Bell size={18}/></a><span className="avatar">{initials}</span></div></header>
      <div className="page-content"><div className="welcome-row"><div><span className="eyebrow">YOUR CAMPUS, IN SYNC</span><h1>{greeting}, {user.name.split(" ")[0]} <span>✦</span></h1><p>Your academic life, organised in one intelligent workspace.</p></div><div className="today-pill"><CalendarDays size={16}/>{new Intl.DateTimeFormat("en",{weekday:"long",day:"numeric",month:"short"}).format(new Date())}</div></div>
        <section className="hero-grid"><div className="hero-card"><div className="hero-top"><span><Sparkles size={15}/> CAMPUS OVERVIEW</span><span className="live-dot">SYSTEM ONLINE</span></div><h2>Make every day<br/>count.</h2><p>Stay ahead of your classes, finances and campus updates.</p><div className="hero-stats"><div><b>{expenses.length}</b><small>Expenses tracked</small></div><div><b>{notices.length}</b><small>New announcements</small></div></div></div>
          <div className="metric-card"><div className="metric-icon purple"><Wallet/></div><span className="metric-label">TOTAL RECORDED SPENDING</span><strong>{loading?"—":money(spent)}</strong><small>Based on your saved transactions</small><button className="text-action" onClick={()=>setModal(true)}>Add transaction <ArrowUpRight size={15}/></button></div>
        </section>
        <div className="section-title" id="finance"><div><span className="eyebrow">PERSONAL MANAGEMENT</span><h2>Your workspace</h2></div><span className="secure-tag"><Activity size={14}/> Live data</span></div>
        <div className="content-grid"><section className="surface-card"><div className="card-heading"><div><h3>Recent expenses</h3><p>Track and manage your campus spending.</p></div><button className="round-action" onClick={()=>setModal(true)}><Plus size={17}/></button></div>
          {loading?<div className="empty-state">Loading your transactions…</div>:expenses.length===0?<div className="empty-state"><Wallet size={25}/><b>No expenses yet</b><span>Your saved transactions will appear here.</span><button className="text-action" onClick={()=>setModal(true)}>Add your first expense <ChevronRight size={15}/></button></div>:<div className="transaction-list">{expenses.slice(0,7).map(x=><div className="transaction" key={x.id}><span className="transaction-icon"><Wallet size={17}/></span><span className="transaction-name"><b>{x.title}</b><small>{x.category} · {new Date(x.createdAt).toLocaleDateString()}</small></span><strong>−{money(x.amount)}</strong></div>)}</div>}
        </section>
        <section className="surface-card" id="updates"><div className="card-heading"><div><h3>Campus announcements</h3><p>Official updates from your campus.</p></div><span className="round-icon"><Bell size={17}/></span></div>
          {notices.length===0?<div className="empty-state compact"><Bell size={24}/><b>You're all caught up</b><span>Verified announcements will appear here.</span></div>:<div className="notice-list">{notices.map(n=><article className="notice" key={n.id}><span className="notice-mark"><BookOpen size={16}/></span><div><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleDateString()}</small></div></article>)}</div>}
        </section></div>
        <section className="section-title planner-title" id="planner"><div><span className="eyebrow">YOUR ACADEMIC SCHEDULE</span><h2>Upcoming classes</h2></div></section>
        <section className="surface-card timetable-card">{classes.length===0?<div className="empty-state compact"><CalendarDays size={24}/><b>No upcoming classes assigned</b><span>Your lecturer or administrator will add your sessions here.</span></div>:classes.map(c=><article className="notice" key={c.id}><span className="notice-mark"><Clock3 size={16}/></span><div><b>{c.title}</b><p>{c.courseCode||"Class session"} · {c.location||"Venue to be announced"}</p><small>{new Date(c.startsAt).toLocaleString()} – {new Date(c.endsAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></article>)}</section>
        <section className="section-title planner-title"><div><span className="eyebrow">CAMPUS UTILITIES</span><h2>Academic tools</h2></div></section>
        <div className="tool-grid"><a className="tool-card" href="#planner"><span className="tool-icon"><CalendarDays/></span><b>Study planner</b><small>Organise your study schedule</small><ChevronRight/></a><a className="tool-card" href="#planner"><span className="tool-icon teal"><Clock3/></span><b>Class timetable</b><small>Keep track of your sessions</small><ChevronRight/></a><a className="tool-card" href="#updates"><span className="tool-icon amber"><Bell/></span><b>Smart reminders</b><small>Stay on top of important events</small><ChevronRight/></a></div>
        <footer className="app-footer">© {new Date().getFullYear()} SAMWEL CAMPUS OS <span>ENGINEERED FOR BETTER CAMPUS LIFE</span></footer>
      </div>
    </section>
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      <a href="/" className="mobile-nav-item active"><LayoutDashboard size={18}/><span>Home</span></a>
      <a href="#planner" className="mobile-nav-item"><CalendarDays size={18}/><span>Planner</span></a>
      <a href="#finance" className="mobile-nav-item"><Wallet size={18}/><span>Finance</span></a>
      <a href="#updates" className="mobile-nav-item"><Bell size={18}/><span>Updates</span></a>
      {user.role==="ADMIN"&&<a href="/admin" className="mobile-nav-item"><Shield size={18}/><span>Admin</span></a>}
    </nav>
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal-card" onSubmit={addExpense}><div className="modal-heading"><div><span className="eyebrow">PERSONAL FINANCE</span><h2>Record an expense</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X/></button></div><label>Expense description<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Lunch at cafeteria"/></label><label>Amount in TZS<input required type="number" min="1" max="100000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="5000"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{["Food","Transport","Study","Shopping","Accommodation","Other"].map(c=><option key={c}>{c}</option>)}</select></label>{error&&<p className="form-error">{error}</p>}<button className="primary-btn" disabled={saving}>{saving?"Saving securely…":"Save transaction"}</button></form></div>}
  </main>;
}
