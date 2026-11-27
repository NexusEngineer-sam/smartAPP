"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Home, Tag, Users, FolderLock, Target, BadgeCheck, Plus, Trash2, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

type Item={id:string;title:string;detail:string;amount?:number;done?:boolean};
const sections=[
 {id:"survival",label:"Survival",icon:Wallet,desc:"Budget & spending"},
 {id:"housing",label:"Housing",icon:Home,desc:"Room & roommate"},
 {id:"deals",label:"Student deals",icon:Tag,desc:"Offers & discounts"},
 {id:"study",label:"Study rooms",icon:Users,desc:"Learn together"},
 {id:"wallet",label:"Documents",icon:FolderLock,desc:"Document checklist"},
 {id:"growth",label:"Growth",icon:Target,desc:"Habits & goals"},
 {id:"profile",label:"My profile",icon:BadgeCheck,desc:"Skills & achievements"},
];
const key="samwel-campus-life-v1";
export default function StudentLifeHub({user}:{user:{name:string;email:string}}){
 const [active,setActive]=useState("survival");
 const [data,setData]=useState<Record<string,Item[]>>({});
 const [budget,setBudget]=useState("100000");
 const [draft,setDraft]=useState("");
 const [detail,setDetail]=useState("");
 const [amount,setAmount]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw)setData(JSON.parse(raw));}catch{}},[]);
 useEffect(()=>{if(Object.keys(data).length)try{localStorage.setItem(key,JSON.stringify(data));}catch{}},[data]);
 const items=data[active]||[];
 const spent=(data.survival||[]).reduce((s,x)=>s+(x.amount||0),0);
 const remaining=Math.max(0,Number(budget||0)-spent);
 const add=()=>{
  if(!draft.trim())return;
  const item:Item={id:crypto.randomUUID(),title:draft.trim(),detail:detail.trim(),...(active==="survival"?{amount:Number(amount)||0}:{})};
  setData(old=>({...old,[active]:[item,...(old[active]||[])]}));setDraft("");setDetail("");setAmount("");
 };
 const remove=(id:string)=>setData(old=>({...old,[active]:(old[active]||[]).filter(x=>x.id!==id)}));
 const toggle=(id:string)=>setData(old=>({...old,[active]:(old[active]||[]).map(x=>x.id===id?{...x,done:!x.done}:x)}));
 const money=(n:number)=>new Intl.NumberFormat("en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(n);
 const config:Record<string,{title:string;hint:string;placeholder:string;detail:string;action:string}>={
 survival:{title:"Student Survival Mode",hint:"Set your spending limit and record everyday expenses. This is a personal planning tool, not a bank balance.",placeholder:"Expense e.g. Lunch",detail:"Category e.g. Food, transport",action:"Add expense"},
 housing:{title:"Accommodation & Roommate Finder",hint:"Create a room or roommate post. Listings are personal drafts on this device until connected to a verified campus listing service.",placeholder:"e.g. Looking for a roommate near campus",detail:"Area, rent range, contact preference",action:"Save listing"},
 deals:{title:"Smart Deals & Student Discounts",hint:"Save offers you discover. No offer is represented as verified or active unless its provider confirms it.",placeholder:"Offer or discount title",detail:"Provider, discount, expiry or terms",action:"Save deal"},
 study:{title:"Smart Study Rooms",hint:"Create a study group plan and invite classmates through your usual channels.",placeholder:"e.g. Calculus revision group",detail:"Course, topic, date and meeting place",action:"Create room"},
 wallet:{title:"Digital Document Wallet",hint:"Build a private checklist of important documents. This first version stores labels only, not document files.",placeholder:"e.g. Admission letter",detail:"Optional note / expiry reminder",action:"Add document label"},
 growth:{title:"Personal Growth & Habit Tracker",hint:"Track small habits consistently. Mark an item complete when you finish it.",placeholder:"e.g. Read 20 pages",detail:"Frequency or personal goal",action:"Add habit"},
 profile:{title:"Student Reputation & Trust Profile",hint:"Build a portfolio of skills and achievements. Claims are self-reported until independently verified.",placeholder:"Skill or achievement",detail:"Project, evidence link or short description",action:"Add to profile"},
 };
 const c=config[active];
 return <section className="life-hub">
  <div className="life-hero"><div><span className="life-kicker"><Sparkles size={14}/> STUDENT LIFE ECOSYSTEM</span><h2>Your life, moving forward.</h2><p>Useful tools for money, housing, learning and personal growth — in one place.</p></div><div className="life-hero-mark"><ShieldCheck size={28}/><span>Personal space</span></div></div>
  <div className="life-tabs">{sections.map(s=><button key={s.id} onClick={()=>{setActive(s.id);setDraft("");setDetail("");}} className={active===s.id?"selected":""}><s.icon size={18}/><b>{s.label}</b><small>{s.desc}</small></button>)}</div>
  <div className="life-panel">
   <div className="life-panel-head"><div><span className="life-kicker">YOUR CAMPUS LIFE TOOLS</span><h3>{c.title}</h3><p>{c.hint}</p></div><span className="life-count">{items.length} saved</span></div>
   {active==="survival"&&<div className="survival-summary"><label>Monthly / weekly budget (TZS)<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)}/></label><div className="survival-metrics"><div><small>Recorded spending</small><b>{money(spent)}</b></div><div><small>Planned balance</small><b>{money(remaining)}</b></div></div><div className="life-progress"><span style={{width:`${Math.min(100,Number(budget)>0?spent/Number(budget)*100:0)}%`}}/></div></div>}
   {active==="profile"&&<div className="life-profile"><div className="life-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><small>{user.email}</small><span>Student portfolio · Self-managed</span></div></div>}
   <div className="life-add"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={c.placeholder} maxLength={140}/><input value={detail} onChange={e=>setDetail(e.target.value)} placeholder={c.detail} maxLength={240}/>{active==="survival"&&<input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount in TZS"/>}<button onClick={add} disabled={!draft.trim()}><Plus size={17}/>{c.action}</button></div>
   <div className="life-items">{items.length===0?<div className="life-empty"><CheckCircle2 size={25}/><b>Nothing here yet</b><span>Add your first item to start using this space.</span></div>:items.map(item=><article key={item.id} className={`life-item ${item.done?"completed":""}`}>{active==="growth"&&<button className="life-check" onClick={()=>toggle(item.id)} aria-label="Mark habit complete"><CheckCircle2 size={19}/></button>}<div><b>{item.title}</b>{item.detail&&<p>{item.detail}</p>}{item.amount!==undefined&&<strong>{money(item.amount)}</strong>}</div><button className="life-delete" onClick={()=>remove(item.id)} aria-label="Delete item"><Trash2 size={16}/></button></article>)}</div>
   <div className="life-note"><ShieldCheck size={15}/> Your entries are currently saved in this browser on this device. Cross-device sync, verified listings and secure file uploads are not enabled yet.</div>
  </div>
 </section>;
}
