"use client";
import { useEffect, useState } from "react";
import { Bell, Users, RefreshCw } from "lucide-react";
type Message={id:string;title:string;body:string;createdAt:string;sender:{name:string}};
export default function ClassMessages(){
 const [messages,setMessages]=useState<Message[]>([]);
 const [className,setClassName]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 async function load(){try{const r=await fetch("/api/class-messages",{cache:"no-store"});if(r.ok){const d=await r.json();setMessages(d.messages||[]);setClassName(d.className);}}catch{}finally{setLoading(false);}}
 useEffect(()=>{
  void load();
  const refresh=()=>{if(document.visibilityState==="visible")void load();};
  const timer=window.setInterval(()=>void load(),10000);
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",refresh);
  return()=>{window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
 },[]);
 if(!className)return null;
 return <section className="surface-card class-messages-card"><div className="card-heading"><div><span className="eyebrow">YOUR CLASS</span><h3>Class announcements</h3><p>{className} · Updates from your class representative</p></div><span className="round-icon"><Bell size={17}/></span></div>{messages.length?messages.map(m=><article className="notice" key={m.id}><span className="notice-mark"><Users size={16}/></span><div><b>{m.title}</b><p>{m.body}</p><small>Posted by {m.sender.name} · {new Date(m.createdAt).toLocaleString()}</small></div></article>):<div className="empty-state compact">{loading?"Loading class announcements…":"No class announcements yet. New posts from your CR will appear here automatically."}<RefreshCw size={14}/></div>}</section>;
}