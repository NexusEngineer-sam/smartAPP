"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, Bell, BellOff, Plus, Trash2, Pencil, X, Volume2, VolumeX, Clock3, Repeat, Check } from "lucide-react";

type Alarm={id:string;time:string;label:string;days:number[];enabled:boolean};
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STORE="campus-os-alarms-v1";
const pad=(n:number)=>String(n).padStart(2,"0");
function nextOccurrence(alarm:Alarm,now:Date){const [h,m]=alarm.time.split(":").map(Number);for(let offset=0;offset<8;offset++){const d=new Date(now);d.setDate(now.getDate()+offset);d.setHours(h,m,0,0);if(d.getTime()<=now.getTime())continue;if(alarm.days.length&& !alarm.days.includes(d.getDay()))continue;return d;}return null;}
export default function AlarmSystem(){
 const [alarms,setAlarms]=useState<Alarm[]>([]);
 const [ready,setReady]=useState(false);
 const [time,setTime]=useState("07:00");
 const [label,setLabel]=useState("Wake up");
 const [days,setDays]=useState<number[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [ringing,setRinging]=useState<Alarm|null>(null);
 const [now,setNow]=useState(new Date());
 const [soundOn,setSoundOn]=useState(true);
 const [notice,setNotice]=useState("");
 const audioRef=useRef<AudioContext|null>(null);
 const ringingRef=useRef<Alarm|null>(null);
 const firedRef=useRef<string>("");
 useEffect(()=>{try{const raw=localStorage.getItem(STORE);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setAlarms(parsed);}}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(STORE,JSON.stringify(alarms));}catch{}},[alarms,ready]);
 const stopSound=useCallback(()=>{if(audioRef.current){void audioRef.current.close().catch(()=>{});audioRef.current=null;}if(typeof navigator!=="undefined"&&"vibrate"in navigator)navigator.vibrate(0);},[]);
 const startSound=useCallback(async()=>{try{const Ctx=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)return;const ctx=new Ctx();audioRef.current=ctx;await ctx.resume();let count=0;const beep=()=>{if(ctx.state==="closed")return;const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type="sine";osc.frequency.value=count%2?880:660;gain.gain.setValueAtTime(0.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.22,ctx.currentTime+0.03);gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.45);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.48);count++;};beep();const timer=window.setInterval(beep,850);(ctx as AudioContext&{__alarmTimer?:number}).__alarmTimer=timer;}catch{setNotice("Gusa 'Test sound' kwanza ili kuruhusu sauti kwenye browser.");}},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{const current=new Date();setNow(current);const key=[current.getFullYear(),current.getMonth(),current.getDate(),current.getHours(),current.getMinutes()].join("-");const match=alarms.find(a=>a.enabled&&a.time===pad(current.getHours())+":"+pad(current.getMinutes())&&(!a.days.length||a.days.includes(current.getDay())));if(match&&firedRef.current!==key+"-"+match.id){firedRef.current=key+"-"+match.id;ringingRef.current=match;setRinging(match);if(soundOn)void startSound();if("Notification"in window&&Notification.permission==="granted")new Notification("SAMWEL CAMPUS OS — Alarm",{body:match.label||"Alarm time",tag:"campus-alarm-"+match.id});}} ,1000);return()=>window.clearInterval(timer);},[alarms,soundOn,startSound]);
 useEffect(()=>()=>stopSound(),[stopSound]);
 async function enableNotifications(){if(!("Notification"in window)){setNotice("Browser hii haitumii desktop notifications.");return;}const result=await Notification.requestPermission();setNotice(result==="granted"?"Arifa zimewashwa.":"Ruhusa ya arifa haijatolewa.");}
 function save(){const alarm:Alarm={id:editing||crypto.randomUUID(),time,label:label.trim()||"Alarm",days,enabled:true};setAlarms(old=>editing?old.map(a=>a.id===editing?alarm:a):[...old,alarm].sort((a,b)=>a.time.localeCompare(b.time)));setEditing(null);setTime("07:00");setLabel("Wake up");setDays([]);}
 function edit(a:Alarm){setEditing(a.id);setTime(a.time);setLabel(a.label);setDays(a.days);}
 function dismiss(){setRinging(null);ringingRef.current=null;stopSound();}
 function snooze(){const a=ringingRef.current;if(a){const d=new Date(Date.now()+5*60000);const snoozeAlarm:Alarm={id:"snooze-"+Date.now(),time:pad(d.getHours())+":"+pad(d.getMinutes()),label:"Snooze · "+a.label,days:[],enabled:true};setAlarms(old=>[...old,snoozeAlarm]);}dismiss();}
 const upcoming=alarms.filter(a=>a.enabled).map(a=>({alarm:a,next:nextOccurrence(a,now)})).sort((a,b)=>(a.next?.getTime()||Infinity)-(b.next?.getTime()||Infinity));
 return <section className="alarm-system">
  <div className="alarm-hero"><div className="alarm-hero-icon"><AlarmClock size={27}/></div><div><span className="alarm-kicker">PERSONAL TIME MANAGEMENT</span><h2>Smart Alarm</h2><p>Weka ratiba yako. Campus OS itakukumbusha muda ukifika.</p></div><div className="alarm-live-clock"><strong>{pad(now.getHours())}:{pad(now.getMinutes())}</strong><small>{now.toLocaleDateString("en",{weekday:"long",day:"numeric",month:"short"})}</small></div></div>
  <div className="alarm-columns"><div className="alarm-panel alarm-editor"><div className="alarm-panel-heading"><div><span className="alarm-kicker">CREATE YOUR ROUTINE</span><h3>{editing?"Edit alarm":"New alarm"}</h3></div><span className="alarm-heading-icon"><Plus size={18}/></span></div>
   <label className="alarm-field"><span>Alarm time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
   <label className="alarm-field"><span>Alarm name</span><input value={label} maxLength={50} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Lecture, Wake up"/></label>
   <div className="alarm-field"><span>Repeat <small> · leave empty for once</small></span><div className="alarm-days">{DAYS.map((d,i)=><button type="button" key={d} className={days.includes(i)?"selected":""} onClick={()=>setDays(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}>{d}</button>)}</div></div>
   <div className="alarm-editor-actions"><button className="alarm-save-btn" type="button" onClick={save}><Check size={16}/>{editing?"Update alarm":"Save alarm"}</button>{editing&&<button className="alarm-cancel-btn" type="button" onClick={()=>{setEditing(null);setTime("07:00");setLabel("Wake up");setDays([]);}}>Cancel</button>}</div>
   <div className="alarm-permissions"><button type="button" onClick={()=>void enableNotifications()}><Bell size={15}/> Enable notifications</button><button type="button" onClick={()=>void startSound()}><Volume2 size={15}/> Test sound</button></div>{notice&&<p className="alarm-notice">{notice}</p>}
  </div>
  <div className="alarm-panel alarm-list-panel"><div className="alarm-panel-heading"><div><span className="alarm-kicker">YOUR SCHEDULE</span><h3>Alarms <span className="alarm-count">{alarms.length}</span></h3></div><span className="alarm-heading-icon"><Clock3 size={18}/></span></div>
   {alarms.length===0?<div className="alarm-empty"><AlarmClock size={30}/><b>No alarms yet</b><span>Create your first alarm to get started.</span></div>:<div className="alarm-list">{upcoming.map(({alarm,next})=><article className={alarm.enabled?"alarm-item":"alarm-item disabled"} key={alarm.id}><div className="alarm-item-main"><strong>{alarm.time}</strong><span>{alarm.label}</span><small>{alarm.days.length?alarm.days.sort((a,b)=>a-b).map(d=>DAYS[d]).join(" · "):"One time"}{next&&alarm.enabled?" · Next "+next.toLocaleDateString("en",{weekday:"short",day:"numeric",month:"short"}):""}</small></div><div className="alarm-item-actions"><button type="button" title="Edit alarm" onClick={()=>edit(alarm)}><Pencil size={15}/></button><button type="button" title="Delete alarm" onClick={()=>setAlarms(old=>old.filter(a=>a.id!==alarm.id))}><Trash2 size={15}/></button><button type="button" className={alarm.enabled?"alarm-toggle on":"alarm-toggle"} aria-label="Toggle alarm" onClick={()=>setAlarms(old=>old.map(a=>a.id===alarm.id?{...a,enabled:!a.enabled}:a))}><span/></button></div></article>)}</div>}
   <div className="alarm-footnote"><Repeat size={14}/> Alarms are saved on this device and run while Campus OS is open.</div>
  </div></div>
  {ringing&&<div className="alarm-ringing-backdrop"><div className="alarm-ringing-card"><div className="alarm-ringing-pulse"><AlarmClock size={34}/></div><span className="alarm-kicker">ALARM IS RINGING</span><strong>{ringing.time}</strong><h3>{ringing.label}</h3><p>Ni muda uliopanga. Umeamka?</p><div><button type="button" onClick={snooze}>Snooze 5 min</button><button type="button" onClick={dismiss}>Dismiss</button></div></div></div>}
 </section>;
}
