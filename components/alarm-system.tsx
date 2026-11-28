"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, Bell, Plus, Trash2, Pencil, Volume2, Clock3, Repeat, Check } from "lucide-react";

type Alarm={id:string;time:string;label:string;days:number[];enabled:boolean};
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STORE="campus-os-alarms-v1";
const pad=(n:number)=>String(n).padStart(2,"0");
function nextOccurrence(alarm:Alarm,now:Date){const [h,m]=alarm.time.split(":").map(Number);for(let offset=0;offset<8;offset++){const d=new Date(now);d.setDate(now.getDate()+offset);d.setHours(h,m,0,0);if(d.getTime()<=now.getTime())continue;if(alarm.days.length&&!alarm.days.includes(d.getDay()))continue;return d;}return null;}

const nativeAlarmId=(value:string)=>{let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return (hash>>>0)%2000000000+1;};
async function syncNativeAlarms(alarms:Alarm[],requestPermissions=false,requestExactAccess=false){
 try{
  const {Capacitor}=await import("@capacitor/core");
  if(!Capacitor.isNativePlatform())return {native:false as const};
  const {LocalNotifications}=await import("@capacitor/local-notifications");
  const pending=await LocalNotifications.getPending();
  const owned=pending.notifications.filter((item:any)=>item.extra?.kind==="nexus-alarm");
  if(!alarms.some(alarm=>alarm.enabled)){
   if(owned.length)await LocalNotifications.cancel({notifications:owned.map((item:any)=>({id:item.id}))});
   return {native:true as const,message:"Hakuna alarm inayowashwa kwa sasa."};
  }
  let permission=await LocalNotifications.checkPermissions();
  if(permission.display!=="granted"&&requestPermissions)permission=await LocalNotifications.requestPermissions();
  if(permission.display!=="granted")return {native:true as const,message:"Ruhusu NEXUS kutuma notifications ili alarm za Android zifanye kazi."};
  const exact=await LocalNotifications.checkExactNotificationSetting();
  if(exact.exact_alarm!=="granted"){
   if(!requestExactAccess)return {native:true as const,message:"Bonyeza Enable notifications kisha ruhusu Alarms & reminders ili Android ihifadhi alarm."};
   const changed=await LocalNotifications.changeExactNotificationSetting();
   if(changed.exact_alarm!=="granted")return {native:true as const,message:"Washa ruhusa ya Alarms & reminders kwenye Android Settings ili alarm iweze kufika kwa muda sahihi."};
  }
  if(owned.length)await LocalNotifications.cancel({notifications:owned.map((item:any)=>({id:item.id}))});
  await LocalNotifications.createChannel({id:"nexus-alarm",name:"NEXUS Alarms",description:"Scheduled NEXUS alarm alerts",importance:5,vibration:true,visibility:1});
  const weekdays=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
  const scheduled:any[]=[];
  for(const alarm of alarms){
   if(!alarm.enabled)continue;
   const base={title:"NEXUS Alarm",body:alarm.label||"Alarm time",channelId:"nexus-alarm",extra:{kind:"nexus-alarm",alarmId:alarm.id},schedule:{allowWhileIdle:true}};
   if(alarm.days.length){
    for(const day of alarm.days){
     const [hour,minute]=alarm.time.split(":").map(Number);
     scheduled.push({...base,id:nativeAlarmId(alarm.id+":"+day),schedule:{...base.schedule,on:{weekday:weekdays[day],hour,minute}}});
    }
   }else{
    const next=nextOccurrence(alarm,new Date());
    if(next)scheduled.push({...base,id:nativeAlarmId(alarm.id+":once"),schedule:{...base.schedule,at:next}});
   }
  }
  if(scheduled.length)await LocalNotifications.schedule({notifications:scheduled});
  return {native:true as const,message:"Alarm za Android zimehifadhiwa kwenye mfumo wa simu."};
 }catch(error){
  return {native:true as const,message:"Android alarm haikuweza kusawazishwa. Hakikisha ruhusa ya Notifications na Alarms & reminders imeruhusiwa."};
 }
}
type AlarmAudioContext=AudioContext&{__alarmTimer?:number;__vibeTimer?:number};
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
 const audioRef=useRef<AlarmAudioContext|null>(null);
 const wakeLockRef=useRef<WakeLockSentinel|null>(null);
 const firedRef=useRef<string>("");
 useEffect(()=>{try{const raw=localStorage.getItem(STORE);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setAlarms(parsed);}}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem(STORE,JSON.stringify(alarms));}catch{}},[alarms,ready]);
 useEffect(()=>{if(!ready)return;let active=true;const sync=()=>{void syncNativeAlarms(alarms).then(result=>{if(active&&result.native&&result.message)setNotice(result.message);});};sync();const onVisible=()=>{if(document.visibilityState==="visible")sync();};document.addEventListener("visibilitychange",onVisible);return()=>{active=false;document.removeEventListener("visibilitychange",onVisible);};},[alarms,ready]);
 const stopSound=useCallback(()=>{const ctx=audioRef.current;if(ctx){if(ctx.__alarmTimer)window.clearInterval(ctx.__alarmTimer);if(ctx.__vibeTimer)window.clearInterval(ctx.__vibeTimer);void ctx.close().catch(()=>{});audioRef.current=null;}if(typeof navigator!=="undefined"&&"vibrate"in navigator)navigator.vibrate(0);},[]);
 const startSound=useCallback(async()=>{
  try{
   stopSound();
   const Ctx=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Ctx){setNotice("Kifaa hiki hakitumii Web Audio. Washa notification na vibration.");return;}
   const ctx=new Ctx() as AlarmAudioContext;audioRef.current=ctx;await ctx.resume();
   let phase=0;
   const beep=()=>{
    if(ctx.state==="closed")return;
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.type="square";
    const base=phase%2===0?1046:784;
    osc.frequency.setValueAtTime(base,ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(base===1046?784:1046,ctx.currentTime+0.28);
    gain.gain.setValueAtTime(0.0001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.78,ctx.currentTime+0.025);
    gain.gain.setValueAtTime(0.78,ctx.currentTime+0.22);
    gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.34);
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.36);phase++;
   };
   beep();ctx.__alarmTimer=window.setInterval(beep,420);
   if("vibrate"in navigator){navigator.vibrate([700,250,700,250]);ctx.__vibeTimer=window.setInterval(()=>navigator.vibrate([700,250,700,250]),1900);}
   setNotice("Alarm imewashwa kwa sauti kubwa inayoruhusiwa na kifaa. Tumia volume ya Media/Alarm ya simu kuongeza zaidi.");
  }catch{setNotice("Gusa 'Test sound' kwanza ili kuruhusu sauti kwenye browser.");}
 },[stopSound]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{
   const current=new Date();setNow(current);
   const key=[current.getFullYear(),current.getMonth(),current.getDate(),current.getHours(),current.getMinutes()].join("-");
   const match=alarms.find(a=>a.enabled&&a.time===pad(current.getHours())+":"+pad(current.getMinutes())&&(!a.days.length||a.days.includes(current.getDay())));
   if(match&&firedRef.current!==key+"-"+match.id){
    firedRef.current=key+"-"+match.id;setRinging(match);
    if(soundOn)void startSound();
    if("Notification"in window&&Notification.permission==="granted")new Notification("NEXUS — Alarm",{body:match.label||"Alarm time",tag:"nexus-alarm-"+match.id,requireInteraction:true});
   }
  },1000);
  return()=>window.clearInterval(timer);
 },[alarms,soundOn,startSound]);
 useEffect(()=>{
  if(!ringing)return;
  let active=true;
  const acquire=async()=>{try{if("wakeLock"in navigator){wakeLockRef.current=await navigator.wakeLock.request("screen");}}catch{/* Browser/OS may deny wake lock. */}};
  void acquire();
  const onVisible=()=>{if(active&&document.visibilityState==="visible")void acquire();};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{active=false;document.removeEventListener("visibilitychange",onVisible);void wakeLockRef.current?.release().catch(()=>{});wakeLockRef.current=null;};
 },[ringing]);
 useEffect(()=>()=>stopSound(),[stopSound]);
 async function enableNotifications(){
  try{
   const {Capacitor}=await import("@capacitor/core");
   if(Capacitor.isNativePlatform()){
    const result=await syncNativeAlarms(alarms,true,true);
    if(result.native){setNotice(result.message||"Android alarm settings updated.");return;}
   }
  }catch{/* Continue with the browser notification fallback. */}
  if(!("Notification"in window)){setNotice("Browser hii haitumii notifications.");return;}
  const result=await Notification.requestPermission();
  setNotice(result==="granted"?"Arifa zimewashwa.":"Ruhusa ya arifa haijatolewa.");
 }
 function save(){const alarm:Alarm={id:editing||crypto.randomUUID(),time,label:label.trim()||"Alarm",days,enabled:true};setAlarms(old=>editing?old.map(a=>a.id===editing?alarm:a):[...old,alarm].sort((a,b)=>a.time.localeCompare(b.time)));setEditing(null);setTime("07:00");setLabel("Wake up");setDays([]);}
 function edit(a:Alarm){setEditing(a.id);setTime(a.time);setLabel(a.label);setDays(a.days);}
 function dismiss(){setRinging(null);stopSound();}
 function snooze(){const a=ringing;if(a){const d=new Date(Date.now()+5*60000);const snoozeAlarm:Alarm={id:"snooze-"+Date.now(),time:pad(d.getHours())+":"+pad(d.getMinutes()),label:"Snooze · "+a.label,days:[],enabled:true};setAlarms(old=>[...old,snoozeAlarm]);}dismiss();}
 const upcoming=alarms.filter(a=>a.enabled).map(a=>({alarm:a,next:nextOccurrence(a,now)})).sort((a,b)=>(a.next?.getTime()||Infinity)-(b.next?.getTime()||Infinity));
 return <section className="alarm-system">
  <div className="alarm-hero"><div className="alarm-hero-icon"><AlarmClock size={27}/></div><div><span className="alarm-kicker">PERSONAL TIME MANAGEMENT</span><h2>Smart Alarm</h2><p>Weka ratiba yako. NEXUS itakukumbusha muda ukifika.</p></div><div className="alarm-live-clock"><strong>{pad(now.getHours())}:{pad(now.getMinutes())}</strong><small>{now.toLocaleDateString("en",{weekday:"long",day:"numeric",month:"short"})}</small></div></div>
  <div className="alarm-columns"><div className="alarm-panel alarm-editor"><div className="alarm-panel-heading"><div><span className="alarm-kicker">CREATE YOUR ROUTINE</span><h3>{editing?"Edit alarm":"New alarm"}</h3></div><span className="alarm-heading-icon"><Plus size={18}/></span></div>
   <label className="alarm-field"><span>Alarm time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>
   <label className="alarm-field"><span>Alarm name</span><input value={label} maxLength={50} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Lecture, Wake up"/></label>
   <div className="alarm-field"><span>Repeat <small> · leave empty for once</small></span><div className="alarm-days">{DAYS.map((d,i)=><button type="button" key={d} className={days.includes(i)?"selected":""} onClick={()=>setDays(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}>{d}</button>)}</div></div>
   <div className="alarm-editor-actions"><button className="alarm-save-btn" type="button" onClick={save}><Check size={16}/>{editing?"Update alarm":"Save alarm"}</button>{editing&&<button className="alarm-cancel-btn" type="button" onClick={()=>{setEditing(null);setTime("07:00");setLabel("Wake up");setDays([]);}}>Cancel</button>}</div>
   <div className="alarm-permissions"><button type="button" onClick={()=>void enableNotifications()}><Bell size={15}/> Enable notifications</button><button type="button" onClick={()=>void startSound()}><Volume2 size={15}/> Test loud sound + vibration</button></div>{notice&&<p className="alarm-notice">{notice}</p>}
  </div>
  <div className="alarm-panel alarm-list-panel"><div className="alarm-panel-heading"><div><span className="alarm-kicker">YOUR SCHEDULE</span><h3>Alarms <span className="alarm-count">{alarms.length}</span></h3></div><span className="alarm-heading-icon"><Clock3 size={18}/></span></div>
   {alarms.length===0?<div className="alarm-empty"><AlarmClock size={30}/><b>No alarms yet</b><span>Create your first alarm to get started.</span></div>:<div className="alarm-list">{upcoming.map(({alarm,next})=><article className={alarm.enabled?"alarm-item":"alarm-item disabled"} key={alarm.id}><div className="alarm-item-main"><strong>{alarm.time}</strong><span>{alarm.label}</span><small>{alarm.days.length?[...alarm.days].sort((a,b)=>a-b).map(d=>DAYS[d]).join(" · "):"One time"}{next&&alarm.enabled?" · Next "+next.toLocaleDateString("en",{weekday:"short",day:"numeric",month:"short"}):""}</small></div><div className="alarm-item-actions"><button type="button" title="Edit alarm" onClick={()=>edit(alarm)}><Pencil size={15}/></button><button type="button" title="Delete alarm" onClick={()=>setAlarms(old=>old.filter(a=>a.id!==alarm.id))}><Trash2 size={15}/></button><button type="button" className={alarm.enabled?"alarm-toggle on":"alarm-toggle"} aria-label="Toggle alarm" onClick={()=>setAlarms(old=>old.map(a=>a.id===alarm.id?{...a,enabled:!a.enabled}:a))}><span/></button></div></article>)}</div>}
   <div className="alarm-footnote"><Repeat size={14}/> Kwenye Android APK yenye Capacitor, alarm huhifadhiwa kwenye mfumo wa simu na inaweza kutoa arifa hata NEXUS ikifungwa. PWA/browser pekee haiwezi kuhakikisha alarm app ikiwa imefungwa.</div>
  </div></div>
  {ringing&&<div className="alarm-ringing-backdrop"><div className="alarm-ringing-card"><div className="alarm-ringing-pulse"><AlarmClock size={34}/></div><span className="alarm-kicker">ALARM IS RINGING</span><strong>{ringing.time}</strong><h3>{ringing.label}</h3><p>Ni muda uliopanga. Umeamka?</p><div><button type="button" onClick={snooze}>Snooze 5 min</button><button type="button" onClick={dismiss}>Dismiss</button></div></div></div>}
 </section>;
}
