"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck, MessageCircle, RefreshCw, ShieldCheck, Users } from "lucide-react";
type Message={id:string;title:string;body:string;createdAt:string;sender:{name:string}};
export default function ClassMessages(){
 const [messages,setMessages]=useState<Message[]>([]);
 const [className,setClassName]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 async function load(){try{const r=await fetch("/api/class-messages",{cache:"no-store"});if(r.ok){const d=await r.json();setMessages(d.messages||[]);setClassName(d.className);}}catch{}finally{setLoading(false);}}
 useEffect(()=>{void load();const refresh=()=>{if(document.visibilityState==="visible")void load();};const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};},[]);
 if(!className)return null;
 return <section className="wa-chat-shell">
  <header className="wa-chat-header"><div className="wa-chat-avatar"><Users size={20}/><i/></div><div className="wa-chat-heading"><b>{className}</b><span><span className="wa-online-dot"/> Class updates · CR announcements</span></div><div className="wa-chat-header-actions"><span><ShieldCheck size={17}/></span><span><Bell size={17}/></span></div></header>
  <div className="wa-chat-subbar"><MessageCircle size={14}/> Official messages for members of your class only</div>
  <div className="wa-chat-wall"><div className="wa-date-chip">CLASS NOTICEBOARD</div>
   {loading?<div className="wa-chat-empty"><RefreshCw size={20}/><b>Opening your class chat…</b></div>:messages.length===0?<div className="wa-chat-empty"><span className="wa-empty-icon"><MessageCircle size={23}/></span><b>Your class chat is ready</b><span>Updates from your Class Representative will appear here.</span></div>:[...messages].reverse().map(m=><article className="wa-message-row" key={m.id}><div className="wa-message-bubble"><span className="wa-message-author">{m.sender?.name||"Class Representative"}</span><b className="wa-message-title">{m.title}</b><p>{m.body}</p><div className="wa-message-meta"><span>{new Date(m.createdAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</span><CheckCheck size={13}/></div></div></article>)}
  </div><footer className="wa-chat-footer"><span className="wa-lock"><ShieldCheck size={14}/> Only your assigned class can see these updates</span><span className="wa-refresh-note">Auto-refreshes every 15 seconds</span></footer>
 </section>;
}