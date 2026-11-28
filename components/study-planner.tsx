"use client";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, MapPin, Plus, Trash2, CheckCircle2, BookOpen, BellRing, Repeat2, GraduationCap } from "lucide-react";

type Kind="CLASS"|"STUDY"|"ASSIGNMENT"|"EXAM";
type Item={id:string;kind:Kind;title:string;courseCode:string|null;location:string|null;startsAt:string;endsAt:string|null;reminderMins:number;repeatWeekly:boolean;done:boolean};
const kinds:{value:Kind;label:string}[]=[{value:"CLASS",label:"Class / Lecture"},{value:"STUDY",label:"Study session"},{value:"ASSIGNMENT",label:"Assignment deadline"},{value:"EXAM",label:"Exam"}];
function localDate(d:Date){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);}
export default function StudyPlanner(){
 const [items,setItems]=useState<Item[]>([]);
 const [kind,setKind]=useState<Kind>("CLASS");
 const [title,setTitle]=useState("");
 const [courseCode,setCourseCode]=useState("");
 const [location,setLocation]=useState("");
 const [date,setDate]=useState(localDate(new Date()));
 const [time,setTime]=useState("08:00");
 const [endTime,setEndTime]=useState("10:00");
 const [reminder,setReminder]=useState("15");
 const [repeat,setRepeat]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function load(){
  setLoading(true);setError("");
  try{const r=await fetch("/api/personal-schedule",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kupakia ratiba.");setItems(d.items||[]);}
  catch(e){setError(e instanceof Error?e.message:"Imeshindikana kupakia ratiba.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 const upcoming=useMemo(()=>items.filter(x=>!x.done).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime()),[items]);
 const completedCount=useMemo(()=>items.filter(x=>x.done).length,[items]);
 const examCount=useMemo(()=>upcoming.filter(x=>x.kind==="EXAM").length,[upcoming]);
 const assignmentCount=useMemo(()=>upcoming.filter(x=>x.kind==="ASSIGNMENT").length,[upcoming]);
 async function add(){
  if(!title.trim()||!date||!time){setError("Jaza jina, tarehe na muda.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const start=new Date(date+"T"+time);
   const end=kind==="CLASS"&&endTime?new Date(date+"T"+endTime):null;
   const r=await fetch("/api/personal-schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,title:title.trim(),courseCode:courseCode.trim()||null,location:location.trim()||null,startsAt:start.toISOString(),endsAt:end?.toISOString()||null,reminderMins:Number(reminder),repeatWeekly:kind==="CLASS"&&repeat})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kuhifadhi ratiba.");
   setItems(old=>[...old,d.item].sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime()));
   setTitle("");setCourseCode("");setLocation("");setNotice("Imehifadhiwa. Ukumbusho umewekwa kulingana na muda uliochagua.");
  }catch(e){setError(e instanceof Error?e.message:"Imeshindikana kuhifadhi.");}
  finally{setBusy(false);}
 }
 async function toggle(item:Item){
  try{const r=await fetch("/api/personal-schedule",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,done:!item.done})});if(!r.ok)throw new Error();setItems(old=>old.map(x=>x.id===item.id?{...x,done:!x.done}:x));}
  catch{setError("Imeshindikana kusasisha ratiba.");}
 }
 async function remove(id:string){
  try{const r=await fetch("/api/personal-schedule",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});if(!r.ok)throw new Error();setItems(old=>old.filter(x=>x.id!==id));}
  catch{setError("Imeshindikana kufuta ratiba.");}
 }
 const label=(k:Kind)=>kinds.find(x=>x.value===k)?.label||k;
 return <section className="study-planner">
  <div className="study-planner-hero"><div><span className="study-kicker"><GraduationCap size={15}/> SMART ACADEMIC ASSISTANT</span><h2>Panga muda wako. Fikia malengo yako.</h2><p>Ratiba unazoweka ni zako binafsi na zinahifadhiwa kwenye akaunti yako.</p></div><div className="study-hero-icon"><CalendarDays size={29}/></div></div>
  <div className="study-overview-grid" aria-label="Muhtasari wa maendeleo ya masomo">
   <article className="study-overview-card"><span>Ratiba zinazosubiri</span><strong>{upcoming.length}</strong><small>Shughuli ambazo hazijakamilika</small></article>
   <article className="study-overview-card"><span>Mitihani ijayo</span><strong>{examCount}</strong><small>Mitihani uliyoipanga</small></article>
   <article className="study-overview-card"><span>Assignments</span><strong>{assignmentCount}</strong><small>Kazi zinazohitaji kukamilishwa</small></article>
   <article className="study-overview-card"><span>Zilizokamilika</span><strong>{completedCount}</strong><small>Hatua ulizokwishaweka tiki</small></article>
  </div>
  <div className="study-layout">
   <section className="surface-card study-form-card"><div className="card-heading"><div><h3><Plus size={16}/> Ongeza ratiba</h3><p>Jaza taarifa za lecture au kazi ya masomo.</p></div></div>
    <label>Aina ya ratiba<select value={kind} onChange={e=>{setKind(e.target.value as Kind);setRepeat(false);}}>{kinds.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    <label>Jina / Somo<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Mfano: Data Structures"/></label>
    <div className="study-form-row"><label>Course code (si lazima)<input value={courseCode} onChange={e=>setCourseCode(e.target.value)} placeholder="CS 210"/></label><label>{kind==="CLASS"?"Chumba":"Mahali / Maelezo"}<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Room B12"/></label></div>
    <div className="study-form-row"><label>Tarehe<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Muda wa kuanza / deadline<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>
    {kind==="CLASS"&&<label>Muda wa kumaliza<input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)}/></label>}
    <label><BellRing size={14}/> Nikumbushe kabla<select value={reminder} onChange={e=>setReminder(e.target.value)}><option value="0">Usinikumbushe</option><option value="5">Dakika 5</option><option value="10">Dakika 10</option><option value="15">Dakika 15</option><option value="30">Dakika 30</option><option value="60">Saa 1</option><option value="120">Saa 2</option><option value="1440">Siku 1</option></select></label>
    {kind==="CLASS"&&<label className="study-repeat"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/><span><Repeat2 size={15}/> Rudia kila wiki siku hii</span></label>}
    {error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p className="life-success" role="status">{notice}</p>}
    <button className="primary-btn" type="button" onClick={()=>void add()} disabled={busy}>{busy?"Inahifadhi…":"Hifadhi ratiba yangu"}</button>
   </section>
   <section className="surface-card study-list-card"><div className="card-heading"><div><h3>Ratiba yangu</h3><p>{upcoming.length} shughuli ambazo hazijakamilika</p></div><span className="study-count">{upcoming.length}</span></div>
    {loading?<div className="empty-state">Inapakia ratiba…</div>:items.length===0?<div className="empty-state"><CalendarDays size={26}/><b>Bado hujaweka ratiba</b><span>Ongeza lecture, study session, assignment au mtihani.</span></div>:<div className="study-items">{items.map(item=><article className={`study-item ${item.done?"is-done":""}`} key={item.id}><button className="study-done" type="button" onClick={()=>void toggle(item)} aria-label={item.done?"Mark incomplete":"Mark complete"}><CheckCircle2 size={19}/></button><div className="study-item-main"><span className="study-type">{label(item.kind)}{item.repeatWeekly&&" · Kila wiki"}</span><b>{item.title}</b><small><CalendarDays size={13}/>{new Date(item.startsAt).toLocaleDateString("sw-TZ",{weekday:"short",day:"numeric",month:"short",year:"numeric"})} · <Clock3 size={13}/>{new Date(item.startsAt).toLocaleTimeString("sw-TZ",{hour:"2-digit",minute:"2-digit"})}{item.endsAt?" – "+new Date(item.endsAt).toLocaleTimeString("sw-TZ",{hour:"2-digit",minute:"2-digit"}):""}</small>{(item.courseCode||item.location)&&<small>{item.courseCode||""}{item.courseCode&&item.location?" · ":""}{item.location?<><MapPin size={12}/>{item.location}</>:""}</small>}<small><BellRing size={12}/> Ukumbusho: {item.reminderMins===0?"Umezimwa":item.reminderMins===60?"Saa 1 kabla":item.reminderMins===1440?"Siku 1 kabla":item.reminderMins+" dakika kabla"}</small></div><button className="study-delete" type="button" onClick={()=>void remove(item.id)} aria-label="Delete schedule"><Trash2 size={16}/></button></article>)}</div>}
   </section>
  </div>
  <div className="study-reminder-note"><BellRing size={16}/><span>Kwa ukumbusho kufika hata app ikiwa imefungwa, washa <b>Phone alerts</b> kwenye alama ya kengele na ruhusu notifications. Server pia inahitaji ratiba ya kuendesha reminder job na VAPID keys.</span></div>
 </section>;
}
