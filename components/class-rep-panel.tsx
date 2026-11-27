"use client";
import { FormEvent, useEffect, useState } from "react";
import { Bell, Send, Users, Clock3 } from "lucide-react";

type Message = { id: string; title: string; body: string; createdAt: string };
export default function ClassRepPanel() {
 const [className,setClassName]=useState<string|null>(null);
 const [memberCount,setMemberCount]=useState(0);
 const [messages,setMessages]=useState<Message[]>([]);
 const [title,setTitle]=useState("");const [body,setBody]=useState("");
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch("/api/class-notifications",{cache:"no-store"});const d=await r.json();if(r.ok){setClassName(d.className);setMemberCount(d.memberCount||0);setMessages(d.messages||[]);}else setError(d.error||"Could not load class notifications.");}catch{setError("Network error. Try again.");}}
 useEffect(()=>{void load();},[]);
 async function send(e:FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/class-notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,body})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Message could not be sent.");setMessages(x=>[d.message,...x]);setTitle("");setBody("");setNotice("Notification sent to "+d.recipientCount+" class members.");}catch(e){setError(e instanceof Error?e.message:"Could not send notification.");}finally{setBusy(false);}}
 return <section className="surface-card class-rep-panel" id="class-rep">
  <div className="card-heading"><div><span className="eyebrow">CLASS COMMUNICATION</span><h3>CR notification centre</h3><p>{className||"Your class assignment"}</p></div><span className="round-icon"><Bell size={17}/></span></div>
  {!className?<div className="empty-state compact"><Users size={24}/><b>Class not assigned yet</b><span>Ask the administrator to assign you to your class.</span></div>:<>
   <div className="class-rep-stats"><span><Users size={16}/> {memberCount} active members</span><span><Bell size={16}/> Class-only delivery</span></div>
   <form className="class-rep-form" onSubmit={send}><label>Notification title<input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Important class meeting"/></label><label>Message<textarea required minLength={5} maxLength={2000} rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write a message for your class members…"/></label>{error&&<p className="form-error">{error}</p>}{notice&&<p className="success-message">{notice}</p>}<button className="primary-btn" disabled={busy||memberCount===0}><Send size={15}/>{busy?"Sending…":"Send to my class"}</button></form>
   <div className="class-rep-history"><div className="card-heading"><div><h3>Sent notifications</h3><p>Your latest class messages</p></div></div>{messages.length?messages.map(m=><article className="notice" key={m.id}><span className="notice-mark"><Bell size={16}/></span><div><b>{m.title}</b><p>{m.body}</p><small><Clock3 size={12}/> {new Date(m.createdAt).toLocaleString()}</small></div></article>):<div className="empty-state compact">No notifications sent yet.</div>}</div>
  </>}
 </section>;
}