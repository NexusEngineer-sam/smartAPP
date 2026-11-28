"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PushNotifications from "@/components/push-notifications";
import NotificationInbox from "@/components/notification-inbox";
import BusinessCenter from "@/components/business-center";
import EngagementTracker from "@/components/engagement-tracker";
import DataUsageTracker from "@/components/data-usage-tracker";
import EngagementAnalytics from "@/components/engagement-analytics";
import CampusVideoHub from "@/components/campus-video-hub";
import SocialFeed from "@/components/social-feed";
import DigitalId from "@/components/digital-id";
import CampusGuide from "@/components/campus-guide";
import ClassRepPanel from "@/components/class-rep-panel";
import ClassMessages from "@/components/class-messages";
import StudentLifeHub from "@/components/student-life-hub";
import StudyPlanner from "@/components/study-planner";
import CampusEventsHub from "@/components/campus-events-hub";
import GlobalCampusNetwork from "@/components/global-campus-network";
import CampusMessenger from "@/components/campus-messenger";
import { Activity, Bell, BookOpen, CalendarDays, ChevronRight, CircleHelp, GraduationCap, LayoutDashboard, LogOut, Plus, Shield, Wallet, X, ArrowUpRight, Clock3, Sparkles, Megaphone, Video, Users, ChartNoAxesCombined, Settings, Globe2, MessageCircle } from "lucide-react";

type User = { id: string; name: string; email: string; role: string; avatarUrl?: string | null };
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
  const [activeSection,setActiveSection]=useState("home");
  const [moreOpen,setMoreOpen]=useState(false);

  async function load(silent=false) {
    if(!silent)setLoading(true);
    try {
      const [e,n,t]=await Promise.all([fetch("/api/expenses",{cache:"no-store"}),fetch("/api/announcements",{cache:"no-store"}),fetch("/api/timetable",{cache:"no-store"})]);
      if(e.status===401){router.replace("/login");return;}
      if(e.ok){const d=await e.json();setExpenses(d.expenses);}
      if(n.ok){const d=await n.json();setNotices(d.announcements);}
      if(t.ok){const d=await t.json();setClasses(d.events);}
    } finally {setLoading(false);}
  }
  useEffect(()=>{
    void load();
    const refresh=()=>{if(document.visibilityState==="visible")void load(true);};
    const timer=window.setInterval(()=>void load(true),20000);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    return ()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[]);
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
  const sectionLabels:Record<string,string>={home:"Overview",study:"Study Zone",social:"Campus Social",videos:"Video Hub",ads:"Ads & Promotions",finance:"My Finance",updates:"Notifications",analytics:"Analytics",life:"Student Life",events:"Campus Events",global:"Global Network",messages:"Campus Messenger"};
  function navigateTo(id:string){setActiveSection(id);setMoreOpen(false);window.scrollTo({top:0,behavior:"smooth"});}

  return <main className="app-shell"><EngagementTracker/><DataUsageTracker/>
    <aside className="sidebar"><div className="brand side-brand"><span className="brand-mark"><GraduationCap size={22}/></span><span>SAMWEL <b>CAMPUS OS</b></span></div>
      <span className="side-label">WORKSPACE</span>{[{id:"home",label:"Overview",icon:LayoutDashboard},{id:"study",label:"Study Zone",icon:BookOpen},{id:"social",label:"Campus Social",icon:Users},{id:"global",label:"Global Network",icon:Globe2},{id:"messages",label:"Messenger",icon:MessageCircle},{id:"events",label:"Campus Events",icon:CalendarDays},{id:"videos",label:"Video Hub",icon:Video},{id:"ads",label:"Ads & Promotions",icon:Megaphone},{id:"finance",label:"My Finance",icon:Wallet},{id:"life",label:"Student Life",icon:Sparkles},{id:"updates",label:"Notifications",icon:Bell},{id:"analytics",label:"Analytics",icon:ChartNoAxesCombined}].map(item=><button key={item.id} type="button" className={`nav-item ${activeSection===item.id?"active":""}`} onClick={()=>{setActiveSection(item.id);window.scrollTo({top:0,behavior:"smooth"});}}><item.icon size={18}/>{item.label}</button>)}
      {user.role==="CLASS_REP"&&<><span className="side-label">CLASS LEADERSHIP</span><a className="nav-item" href="#class-rep"><Bell size={18}/> CR notifications</a></>}{user.role==="ADMIN"&&<><span className="side-label">ADMINISTRATION</span><a className="nav-item" href="/admin"><Shield size={18}/> Control center</a></>}
      <div className="sidebar-bottom"><button type="button" className="nav-item account-nav-link" onClick={()=>router.push("/account")}><Settings size={18}/> Account settings</button><div className="support-link"><CircleHelp size={17}/> Help & support</div><div className="user-chip"><span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials}</span><span className="user-meta"><b>{user.name}</b><small>{user.role.toLowerCase()}</small></span><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div>
    </aside>
    <section className="main-area"><header className="topbar"><div className="mobile-brand"><GraduationCap/> CAMPUS OS</div><div className="topbar-right"><span className="campus-pill"><i/> UDOM · CAMPUS</span><NotificationInbox/><PushNotifications/><span className="avatar">{initials}</span></div></header>
      <div className="page-content"><div className="welcome-row"><div><span className="eyebrow">{activeSection==="home"?"YOUR CAMPUS, IN SYNC":"CAMPUS WORKSPACE"}</span><h1>{activeSection==="home"?`${greeting}, ${user.name.split(" ")[0]}`:sectionLabels[activeSection]} <span>✦</span></h1><p>{activeSection==="home"?"Your academic life, organised in one intelligent workspace.":`Everything you need for ${sectionLabels[activeSection]?.toLowerCase()||"your campus"} in one focused space.`}</p>{activeSection==="home"&&<DigitalId user={user}/>}</div><div className="today-pill"><CalendarDays size={16}/>{new Intl.DateTimeFormat("en",{weekday:"short",day:"numeric",month:"short"}).format(new Date())}</div></div>
        
        {activeSection==="home"&&<><CampusGuide/><section className="hero-grid"><div className="hero-card"><div className="hero-top"><span><Sparkles size={15}/> CAMPUS OVERVIEW</span><span className="live-dot">SYSTEM ONLINE</span></div><h2>Make every day<br/>count.</h2><p>Stay ahead of your classes, finances and campus updates.</p><div className="hero-stats"><div><b>{expenses.length}</b><small>Expenses tracked</small></div><div><b>{notices.length}</b><small>New announcements</small></div></div></div>
          <div className="metric-card"><div className="metric-icon purple"><Wallet/></div><span className="metric-label">TOTAL RECORDED SPENDING</span><strong>{loading?"—":money(spent)}</strong><small>Based on your saved transactions</small><button className="text-action" onClick={()=>setModal(true)}>Add transaction <ArrowUpRight size={15}/></button></div>
        </section>
        <div className="section-title" id="finance"><div><span className="eyebrow">PERSONAL MANAGEMENT</span><h2>Your workspace</h2></div><span className="secure-tag"><Activity size={14}/> Live data</span></div>
        <div className="content-grid"><section className="surface-card"><div className="card-heading"><div><h3>Recent expenses</h3><p>Track and manage your campus spending.</p></div><button className="round-action" onClick={()=>setModal(true)}><Plus size={17}/></button></div>
          {loading?<div className="empty-state">Loading your transactions…</div>:expenses.length===0?<div className="empty-state"><Wallet size={25}/><b>No expenses yet</b><span>Your saved transactions will appear here.</span><button className="text-action" onClick={()=>setModal(true)}>Add your first expense <ChevronRight size={15}/></button></div>:<div className="transaction-list">{expenses.slice(0,7).map(x=><div className="transaction" key={x.id}><span className="transaction-icon"><Wallet size={17}/></span><span className="transaction-name"><b>{x.title}</b><small>{x.category} · {new Date(x.createdAt).toLocaleDateString()}</small></span><strong>−{money(x.amount)}</strong></div>)}</div>}
        </section>
        <section className="surface-card" id="updates"><div className="card-heading"><div><h3>Campus announcements</h3><p>Official updates from your campus.</p></div><span className="round-icon"><Bell size={17}/></span></div>
          {notices.length===0?<div className="empty-state compact"><Bell size={24}/><b>You're all caught up</b><span>Verified announcements will appear here.</span></div>:<div className="notice-list">{notices.map(n=><article className="notice" key={n.id}><span className="notice-mark"><BookOpen size={16}/></span><div><b>{n.title}</b><p>{n.body}</p><small>Campus Administration · {new Date(n.createdAt).toLocaleString()}</small></div></article>)}</div>}
        </section></div>
        <section className="section-title planner-title" id="planner"><div><span className="eyebrow">YOUR ACADEMIC SCHEDULE</span><h2>Upcoming classes</h2></div></section>
        <section className="surface-card timetable-card">{classes.length===0?<div className="empty-state compact"><CalendarDays size={24}/><b>No upcoming classes assigned</b><span>Your lecturer or administrator will add your sessions here.</span></div>:classes.map(c=><article className="notice" key={c.id}><span className="notice-mark"><Clock3 size={16}/></span><div><b>{c.title}</b><p>{c.courseCode||"Class session"} · {c.location||"Venue to be announced"}</p><small>{new Date(c.startsAt).toLocaleString()} – {new Date(c.endsAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div></article>)}</section>
        <section className="section-title planner-title"><div><span className="eyebrow">CAMPUS UTILITIES</span><h2>Academic tools</h2></div></section>
        <div className="tool-grid"><button className="tool-card" onClick={()=>setActiveSection("study")}><span className="tool-icon"><CalendarDays/></span><b>Study planner</b><small>Organise your study schedule</small><ChevronRight/></button><button className="tool-card" onClick={()=>setActiveSection("study")}><span className="tool-icon teal"><Clock3/></span><b>Class timetable</b><small>Keep track of your sessions</small><ChevronRight/></button><button className="tool-card" onClick={()=>setActiveSection("updates")}><span className="tool-icon amber"><Bell/></span><b>Smart reminders</b><small>Stay on top of important events</small><ChevronRight/></button></div></>}
        {activeSection==="study"&&<StudyPlanner/>}
        {activeSection==="social"&&<><SocialFeed user={user}/>{user.role==="CLASS_REP"?<ClassRepPanel/>:<ClassMessages/>}</>}
        {activeSection==="global"&&<GlobalCampusNetwork/>}
        {activeSection==="messages"&&<CampusMessenger currentUser={{id:user.id,name:user.name}}/>}
        {activeSection==="events"&&<CampusEventsHub user={user}/> }
        {activeSection==="life"&&<StudentLifeHub user={user}/>}
        {activeSection==="videos"&&<CampusVideoHub/>}
        {activeSection==="ads"&&<BusinessCenter role={user.role}/>}
        {activeSection==="analytics"&&<EngagementAnalytics role={user.role}/>}
        {activeSection==="finance"&&<><div className="section-title" id="finance"><div><span className="eyebrow">PERSONAL MANAGEMENT</span><h2>My Finance</h2></div><span className="secure-tag">{money(spent)}</span></div><section className="surface-card"><div className="card-heading"><h3>All transactions</h3><button className="round-action" onClick={()=>setModal(true)}><Plus/></button></div><div className="transaction-list">{expenses.map(x=><div className="transaction" key={x.id}><span className="transaction-icon"><Wallet/></span><span className="transaction-name"><b>{x.title}</b><small>{x.category} · {new Date(x.createdAt).toLocaleDateString()}</small></span><strong>−{money(x.amount)}</strong></div>)}</div></section></>}
        {activeSection==="updates"&&<><div className="section-title"><div><span className="eyebrow">OFFICIAL CAMPUS FEED</span><h2>Notifications & updates</h2></div></div><section className="surface-card">{notices.length===0?<div className="empty-state"><Bell/><b>No announcements yet</b></div>:notices.map(n=><article className="notice" key={n.id}><span className="notice-mark"><BookOpen/></span><div><b>{n.title}</b><p>{n.body}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div></article>)}</section></>}
        <footer className="app-footer">© {new Date().getFullYear()} SAMWEL CAMPUS OS <span>ENGINEERED FOR BETTER CAMPUS LIFE</span></footer>
      </div>
    </section>
    <nav className="mobile-bottom-nav" aria-label="Primary navigation">
      {[{id:"home",label:"Home",icon:LayoutDashboard},{id:"study",label:"Study",icon:BookOpen},{id:"social",label:"Community",icon:Users}].map(item=><button type="button" key={item.id} className={`mobile-nav-item ${activeSection===item.id?"active":""}`} onClick={()=>navigateTo(item.id)}><item.icon size={19}/><span>{item.label}</span></button>)}
      <button type="button" className={`mobile-nav-item ${moreOpen||!["home","study","social"].includes(activeSection)?"active":""}`} aria-expanded={moreOpen} onClick={()=>setMoreOpen(v=>!v)}><span className="mobile-more-glyph">···</span><span>More</span></button>
    </nav>
    {moreOpen&&<div className="more-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setMoreOpen(false);}}><section className="more-sheet" role="dialog" aria-modal="true" aria-label="More campus services"><div className="more-sheet-handle"/><div className="more-sheet-heading"><div><span className="eyebrow">CAMPUS SERVICES</span><h2>More spaces</h2></div><button type="button" className="icon-btn" aria-label="Close menu" onClick={()=>setMoreOpen(false)}><X size={19}/></button></div><div className="more-sheet-grid">{[{id:"global",label:"Global Network",hint:"Connect across borders",icon:Globe2},{id:"messages",label:"Campus Messenger",hint:"Private student chats",icon:MessageCircle},{id:"events",label:"Campus Events",hint:"Discover & organize",icon:CalendarDays},{id:"videos",label:"Video Hub",hint:"Watch & publish",icon:Video},{id:"ads",label:"Ads & Promotions",hint:"Business campaigns",icon:Megaphone},{id:"finance",label:"My Finance",hint:"Track spending",icon:Wallet},{id:"life",label:"Student Life",hint:"Your premium student tools",icon:Sparkles},{id:"updates",label:"Notifications",hint:"Campus announcements",icon:Bell},{id:"analytics",label:"Analytics",hint:"Engagement insights",icon:ChartNoAxesCombined},{id:"account",label:"Account settings",hint:"Profile & security",icon:Settings}].map(item=><button type="button" key={item.id} className={`more-sheet-item ${activeSection===item.id?"chosen":""}`} onClick={()=>item.id==="account"?(setMoreOpen(false),router.push("/account")):navigateTo(item.id)}><span><item.icon size={19}/></span><b>{item.label}</b><small>{item.hint}</small><ChevronRight size={15}/></button>)}</div><button type="button" className="more-logout" onClick={logout}><LogOut size={17}/> Sign out</button></section></div>}
    {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="modal-card" onSubmit={addExpense}><div className="modal-heading"><div><span className="eyebrow">PERSONAL FINANCE</span><h2>Record an expense</h2></div><button type="button" className="icon-btn" onClick={()=>setModal(false)}><X/></button></div><label>Expense description<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Lunch at cafeteria"/></label><label>Amount in TZS<input required type="number" min="1" max="100000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="5000"/></label><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{["Food","Transport","Study","Shopping","Accommodation","Other"].map(c=><option key={c}>{c}</option>)}</select></label>{error&&<p className="form-error">{error}</p>}<button className="primary-btn" disabled={saving}>{saving?"Saving securely…":"Save transaction"}</button></form></div>}
  </main>;
}