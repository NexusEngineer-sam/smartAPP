"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Home, Tag, Users, FolderLock, Target, BadgeCheck, Plus, Trash2, CheckCircle2, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";

type Item={id:string;section:string;title:string;detail:string|null;amount:number|null;done:boolean;createdAt:string};
const sections=[
 {id:"survival",label:"Survival",icon:Wallet,desc:"Budget & spending"},
 {id:"housing",label:"Housing",icon:Home,desc:"Room & roommate"},
 {id:"deals",label:"Student deals",icon:Tag,desc:"Offers & discounts"},
 {id:"study",label:"Study rooms",icon:Users,desc:"Learn together"},
 {id:"wallet",label:"Documents",icon:FolderLock,desc:"Document checklist"},
 {id:"growth",label:"Growth",icon:Target,desc:"Habits & goals"},
 {id:"profile",label:"My profile",icon:BadgeCheck,desc:"Skills & achievements"},
];
export default function StudentLifeHub({user}:{user:{name:string;email:string}}){
 const [active,setActive]=useState("survival");
 const [items,setItems]=useState<Item[]>([]);
 const [budget,setBudget]=useState("100000");
 const [draft,setDraft]=useState("");
 const [detail,setDetail]=useState("");
 const [amount,setAmount]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/student-life",{cache:"no-store"});
   if(r.status===401){setError("Tafadhali ingia tena kwenye akaunti yako.");return;}
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kupakia taarifa.");
   const rows:Item[]=d.items||[];setItems(rows.filter(x=>x.section!=="settings"));
   const saved=rows.find(x=>x.section==="settings"&&x.title==="budget");
   if(saved?.amount!==null&&saved?.amount!==undefined)setBudget(String(saved.amount));
  }catch(e){setError(e instanceof Error?e.message:"Imeshindikana kupakia taarifa.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 const visible=useMemo(()=>items.filter(x=>x.section===active),[items,active]);
 const spent=useMemo(()=>items.filter(x=>x.section==="survival").reduce((s,x)=>s+(x.amount||0),0),[items]);
 const remaining=Math.max(0,Number(budget||0)-spent);
 const money=(n:number)=>new Intl.NumberFormat("en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(n);
 async function add(){
  if(!draft.trim())return;
  setSaving(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/student-life",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({section:active,title:draft.trim(),detail:detail.trim()||null,amount:active==="survival"?Number(amount):null})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kuhifadhi.");
   setItems(old=>[d.item,...old]);setDraft("");setDetail("");setAmount("");setNotice("Imehifadhiwa kwenye akaunti yako.");
  }catch(e){setError(e instanceof Error?e.message:"Imeshindikana kuhifadhi.");}
  finally{setSaving(false);}
 }
 async function saveBudget(){
  const value=Number(budget);if(!Number.isSafeInteger(value)||value<0){setError("Weka bajeti sahihi.");return;}
  setError("");
  try{const r=await fetch("/api/student-life",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({section:"settings",title:"budget",amount:value})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Budget haijahifadhiwa.");setNotice("Bajeti imehifadhiwa kwenye akaunti yako.");}
  catch(e){setError(e instanceof Error?e.message:"Budget haijahifadhiwa.");}
 }
 async function remove(id:string){
  setError("");
  try{const r=await fetch("/api/student-life",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kufuta.");setItems(old=>old.filter(x=>x.id!==id));}
  catch(e){setError(e instanceof Error?e.message:"Imeshindikana kufuta.");}
 }
 async function toggle(item:Item){
  try{const r=await fetch("/api/student-life",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,done:!item.done})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kusasisha.");setItems(old=>old.map(x=>x.id===item.id?{...x,done:!x.done}:x));}
  catch(e){setError(e instanceof Error?e.message:"Imeshindikana kusasisha.");}
 }
 const config:Record<string,{title:string;hint:string;placeholder:string;detail:string;action:string}>={
 survival:{title:"Student Survival Mode",hint:"Panga bajeti na rekodi matumizi yako. Hii ni personal budget planner, si salio la benki.",placeholder:"Matumizi mfano: Chakula",detail:"Aina mfano: Food, transport",action:"Ongeza matumizi"},
 housing:{title:"Accommodation & Roommate Finder",hint:"Tengeneza tangazo la chumba au tafuta roommate. Matangazo bado hayajathibitishwa na msimamizi.",placeholder:"Mfano: Natafuta roommate karibu na campus",detail:"Eneo, kodi na namna ya kuwasiliana",action:"Hifadhi tangazo"},
 deals:{title:"Smart Deals & Student Discounts",hint:"Hifadhi offers ulizozipata. Offer haitaonyeshwa kama verified bila uthibitisho wa mtoa huduma.",placeholder:"Jina la offer au punguzo",detail:"Biashara, punguzo, mwisho wa offer na masharti",action:"Hifadhi deal"},
 study:{title:"Smart Study Rooms",hint:"Unda mpango wa study group na ushiriki maelezo na wanafunzi wenzako.",placeholder:"Mfano: Calculus revision group",detail:"Course, topic, tarehe na sehemu",action:"Unda study room"},
 wallet:{title:"Digital Document Wallet",hint:"Hifadhi checklist ya nyaraka muhimu. Kwa sasa ni majina/maelezo tu; upload ya mafaili salama bado haijawezeshwa.",placeholder:"Mfano: Admission letter",detail:"Maelezo au tarehe ya mwisho",action:"Ongeza nyaraka"},
 growth:{title:"Personal Growth & Habit Tracker",hint:"Fuatilia tabia na malengo yako. Weka tiki ukikamilisha.",placeholder:"Mfano: Soma kurasa 20",detail:"Marudio au lengo binafsi",action:"Ongeza habit"},
 profile:{title:"Student Reputation & Trust Profile",hint:"Jenga portfolio ya skills na achievements. Taarifa ni self-reported mpaka zithibitishwe.",placeholder:"Skill au achievement",detail:"Project, kiungo cha ushahidi au maelezo",action:"Ongeza kwenye profile"},
 };
 const c=config[active];
 return <section className="life-hub">
  <div className="life-hero"><div><span className="life-kicker"><Sparkles size={14}/> STUDENT LIFE ECOSYSTEM</span><h2>Your life, moving forward.</h2><p>Huduma za fedha, makazi, masomo na maendeleo yako sehemu moja.</p></div><div className="life-hero-mark"><ShieldCheck size={28}/><span>Private account</span></div></div>
  <div className="life-tabs">{sections.map(s=><button key={s.id} onClick={()=>{setActive(s.id);setDraft("");setDetail("");setError("");}} className={active===s.id?"selected":""}><s.icon size={18}/><b>{s.label}</b><small>{s.desc}</small></button>)}</div>
  <div className="life-panel">
   <div className="life-panel-head"><div><span className="life-kicker">YOUR CAMPUS LIFE TOOLS</span><h3>{c.title}</h3><p>{c.hint}</p></div><span className="life-count">{visible.length} saved</span></div>
   {active==="survival"&&<div className="survival-summary"><label>Bajeti ya wiki/mwezi (TZS)<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)} onBlur={()=>void saveBudget()}/></label><div className="survival-metrics"><div><small>Matumizi yaliyorekodiwa</small><b>{money(spent)}</b></div><div><small>Bajeti iliyobaki</small><b>{money(remaining)}</b></div></div><div className="life-progress"><span style={{width:`${Math.min(100,Number(budget)>0?spent/Number(budget)*100:0)}%`}}/></div></div>}
   {active==="profile"&&<div className="life-profile"><div className="life-avatar">{user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><div><b>{user.name}</b><small>{user.email}</small><span>Student portfolio · Self-managed</span></div></div>}
   <div className="life-add"><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={c.placeholder} maxLength={140}/><input value={detail} onChange={e=>setDetail(e.target.value)} placeholder={c.detail} maxLength={500}/>{active==="survival"&&<input type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Kiasi TZS"/>}<button onClick={()=>void add()} disabled={!draft.trim()||saving}><Plus size={17}/>{saving?"Inahifadhi…":c.action}</button></div>
   {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="life-success" role="status">{notice}</p>}
   <div className="life-items">{loading?<div className="life-empty"><RefreshCw size={22}/><span>Inapakia taarifa zako…</span></div>:visible.length===0?<div className="life-empty"><CheckCircle2 size={25}/><b>Hakuna taarifa bado</b><span>Ongeza taarifa yako ya kwanza kuanza kutumia sehemu hii.</span></div>:visible.map(item=><article key={item.id} className={`life-item ${item.done?"completed":""}`}>{active==="growth"&&<button className="life-check" onClick={()=>void toggle(item)} aria-label="Mark habit complete"><CheckCircle2 size={19}/></button>}<div><b>{item.title}</b>{item.detail&&<p>{item.detail}</p>}{item.amount!==null&&item.amount!==undefined&&<strong>{money(item.amount)}</strong>}</div><button className="life-delete" onClick={()=>void remove(item.id)} aria-label="Delete item"><Trash2 size={16}/></button></article>)}</div>
   <div className="life-note"><ShieldCheck size={15}/> Taarifa zako sasa zinahifadhiwa kwenye database ya akaunti yako na zinapatikana ukibadilisha kifaa. Nyaraka halisi hazipakiiwi bado.</div>
  </div>
 </section>;
}
