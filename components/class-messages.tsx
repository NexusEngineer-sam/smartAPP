"use client";
import { useEffect, useState } from "react";
import { Bell, Users } from "lucide-react";
type Message={id:string;title:string;body:string;createdAt:string;sender:{name:string}};
export default function ClassMessages(){const [messages,setMessages]=useState<Message[]>([]);const [className,setClassName]=useState<string|null>(null);
useEffect(()=>{fetch("/api/class-messages",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>{if(d){setMessages(d.messages||[]);setClassName(d.className);}}).catch(()=>{});},[]);
if(!className)return null;
return <section className="surface-card class-messages-card"><div className="card-heading"><div><span className="eyebrow">YOUR CLASS</span><h3>Class notifications</h3><p>{className}</p></div><span className="round-icon"><Bell size={17}/></span></div>{messages.length?messages.map(m=><article className="notice" key={m.id}><span className="notice-mark"><Users size={16}/></span><div><b>{m.title}</b><p>{m.body}</p><small>From {m.sender.name} · {new Date(m.createdAt).toLocaleString()}</small></div></article>):<div className="empty-state compact">No class messages yet.</div>}</section>;
}