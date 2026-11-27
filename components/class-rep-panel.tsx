"use client";
import { FormEvent, useEffect, useState } from "react";
import { Bell, CheckCheck, Send, ShieldCheck, Users } from "lucide-react";
type Message={id:string;title:string;body:string;createdAt:string};
export default function ClassRepPanel(){
 const [className,setClassName]=useState<string|null>(null);
 const [memberCount,setMemberCount]=useState(0);
 const [messages,setMessages]=useState<Message[]>([]);
 const [title,setTitle]=useState("");const [body,setBody]=useState("");
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 async function load(){try{const r=await fetch("/api/class-notifications",{cache:"no-store"});const d=await r.json();if(r.ok){setClassName(d.className);setMemberCount(d.memberCount||0);setMessages(d.messages||[]);}else setError(d.error||"Could not load class notifications.");}catch{setError("Network error. Try again.");}}
 useEffect(()=>{void load();},[]);
 async function send(e:FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/class-notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,body})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Message could not be sent.");setMessages(x=>[d.message,...x]);setTitle("");setBody("");setNotice("Sent to "+d.recipientCount+" class members.");}catch(e){setError(e instanceof Error?e.message:"Could not send notification.");}finally{setBusy(false);}}
 return <section className="wa-chat-shell wa-cr-shell" id="class-rep">
  <header className="wa-chat-header"><div className="wa-chat-avatar wa-cr-avatar"><Users size={20}/><i/></div><div className="wa-chat-heading"><b>{className||"Class Representative"}</b><span><span className="wa-online-dot"/> Class broadcast channel</span></div><div className="wa-chat-header-actions"><span><ShieldCheck size={17}/></span></div></header>
  {!className?<div className="wa-chat-empty"><Users size={24}/><b>Class not assigned yet</b><span>Ask the administrator to assign you to your class.</span></div>:<>
   <div className="wa-chat-subbar wa-cr-subbar"><span><Users size={14}/> {memberCount} class members</span><span><ShieldCheck size={14}/> Class-only delivery</span></div>
   <div className="wa-chat-wall wa-cr-wall"><div className="wa-date-chip">YOUR CLASS BROADCASTS</div>
    {messages.length===0?<div className="wa-chat-empty"><span className="wa-empty-icon"><Bell size={23}/></span><b>No messages sent yet</b><span>Write an update below. It will reach members of this class only.</span></div>:[...messages].reverse().map(m=><article className="wa-message-row wa-message-out" key={m.id}><div className="wa-message-bubble"><span className="wa-message-author">You · Class Representative</span><b className="wa-message-title">{m.title}</b><p>{m.body}</p><div className="wa-message-meta"><span>{new Date(m.createdAt).toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}</span><CheckCheck size={13}/></div></div></article>)}
   </div>
   <form className="wa-compose" onSubmit={send}><div className="wa-compose-fields"><input aria-label="Message title" required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Announcement title"/><textarea aria-label="Message" required minLength={5} maxLength={2000} rows={2} value={body} onChange={e=>setBody(e.target.value)} placeholder="Type a class update…"/></div><button className="wa-send-btn" disabled={busy||memberCount===0||!title.trim()||!body.trim()} aria-label="Send to class"><Send size={18}/></button>{error&&<p className="form-error">{error}</p>}{notice&&<p className="success-message"><CheckCheck size={13}/> {notice}</p>}</form>
   <footer className="wa-chat-footer"><span className="wa-lock"><ShieldCheck size={14}/> Visible only to your assigned class</span><span className="wa-refresh-note">Sent updates are saved</span></footer>
  </>}
 </section>;
}