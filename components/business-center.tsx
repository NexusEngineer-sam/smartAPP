"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Megaphone, ShieldCheck, Eye, Image as ImageIcon, ExternalLink, Sparkles, BadgeCheck } from "lucide-react";

type Comment = { id:string; body:string; createdAt:string; user:{id:string;name:string;avatarUrl:string|null} };
type Campaign = { id:string; businessName:string; title:string; description:string; contact:string; budgetTzs:number; mediaUrl:string|null; status:"PENDING"|"APPROVED"|"REJECTED"; createdAt:string; advertiserId?:string; _count:{likes:number;comments:number}; likes:{id:string}[]; comments:Comment[] };
export default function BusinessCenter({role}:{role:string}) {
 const [items,setItems]=useState<Campaign[]>([]);
 const [form,setForm]=useState({businessName:"",title:"",description:"",contact:"",mediaUrl:""});
 const [busy,setBusy]=useState(false); const [message,setMessage]=useState(""); const [error,setError]=useState("");
 const [commentDrafts,setCommentDrafts]=useState<Record<string,string>>({});
 const [commentOpen,setCommentOpen]=useState<string|null>(null);
 async function load(){const r=await fetch("/api/business-center",{cache:"no-store"});if(r.ok){const d=await r.json();setItems(d.campaigns||[]);}}
 useEffect(()=>{void load();},[]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/business-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,budgetTzs:0})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kutuma tangazo.");
   setMessage("Tangazo limetumwa bure. Litaonekana kwenye feed baada ya ukaguzi mfupi.");setForm({businessName:"",title:"",description:"",contact:"",mediaUrl:""});await load();
  }catch(e){setError(e instanceof Error?e.message:"Kuna tatizo.");}finally{setBusy(false);}}
 async function interact(id:string,action:"like"|"unlike"|"comment",body?:string){
  const r=await fetch("/api/business-center/interactions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:id,action,...(body?{body}:{})})});
  const d=await r.json();if(!r.ok){setError(d.error||"Imeshindikana.");return;}
  setItems(old=>old.map(x=>x.id===id?{...x,_count:{...x._count,likes:d.likes,comments:d.comments.length},likes:d.likedByMe?[{id:"mine"}]:[],comments:d.comments}:x));
  if(action==="comment")setCommentDrafts(old=>({...old,[id]:""}));
 }
 async function moderate(id:string,status:"APPROVED"|"REJECTED"){const r=await fetch("/api/business-center",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});if(r.ok)await load();else setError("Imeshindikana kubadili hali ya tangazo.");}
 function media(url:string|null){if(!url)return <div className="campus-ad-placeholder"><Sparkles size={34}/><span>SUPPORT CAMPUS CREATORS</span></div>;
  const video=/\.(mp4|webm|mov)(\?|$)/i.test(url);return video?<video className="campus-ad-media" src={url} controls playsInline preload="metadata"/>:<img className="campus-ad-media" src={url} alt="Picha ya tangazo" loading="lazy"/>;}
 const visible=items.filter(x=>x.status==="APPROVED"||x.advertiserId&&x.status==="PENDING"||role==="ADMIN");
 return <section className="campus-ads-page">
  <header className="campus-ads-hero"><div><span className="eyebrow">CAMPUS COMMUNITY • CREATOR ECONOMY</span><h2>Campus <em>Spotlight</em></h2><p>Biashara, huduma na vipaji vya wanafunzi — sehemu moja yenye nguvu.</p></div><div className="campus-free-pill"><Sparkles size={15}/> 100% BURE KWA SASA</div></header>
  <div className="campus-ads-layout"><main className="campus-ad-feed">
   <div className="campus-feed-toolbar"><div><b>Kwa ajili ya campus</b><small>Matangazo mapya kutoka kwenye jamii ya chuo</small></div><span><Eye size={14}/> LIVE FEED</span></div>
   {visible.length===0?<div className="campus-ad-empty"><Megaphone size={30}/><b>Bado hakuna tangazo</b><span>Anza kwa kuweka tangazo lako la kwanza — ni bure.</span></div>:visible.map(ad=><article className="campus-ad-post" key={ad.id}>
    <div className="campus-ad-author"><span className="campus-ad-avatar">{ad.businessName.slice(0,1).toUpperCase()}</span><div><b>{ad.businessName} <BadgeCheck size={13}/></b><small>{new Date(ad.createdAt).toLocaleDateString()} · {ad.status==="PENDING"?"Inasubiri ukaguzi":"Campus promotion"}</small></div><span className="campus-ad-tag">PROMO</span></div>
    <div className="campus-ad-copy"><h3>{ad.title}</h3><p>{ad.description}</p></div>
    <div className="campus-ad-media-wrap">{media(ad.mediaUrl)}</div>
    <div className="campus-ad-actions">
     <button className={ad.likes.length?"liked":""} onClick={()=>void interact(ad.id,ad.likes.length?"unlike":"like")}><Heart size={20} fill={ad.likes.length?"currentColor":"none"}/><b>{ad._count.likes}</b><small>Like</small></button>
     <button onClick={()=>setCommentOpen(commentOpen===ad.id?null:ad.id)}><MessageCircle size={20}/><b>{ad._count.comments}</b><small>Comment</small></button>
     <button onClick={()=>{void navigator.clipboard?.writeText(ad.contact);setMessage("Mawasiliano yamenakiliwa.");}}><Send size={19}/><small>Contact</small></button>
     <a href={ad.contact.startsWith("http")?ad.contact:ad.contact.includes("@")?"mailto:"+ad.contact:"tel:"+ad.contact}><ExternalLink size={18}/><small>Reach out</small></a>
    </div>
    {commentOpen===ad.id&&<div className="campus-ad-comments"><b>Maoni ya jamii</b>{ad.comments.map(c=><div className="campus-ad-comment" key={c.id}><span>{c.user.name.slice(0,1).toUpperCase()}</span><p><b>{c.user.name}</b>{c.body}</p></div>)}<form onSubmit={e=>{e.preventDefault();const body=commentDrafts[ad.id]?.trim();if(body)void interact(ad.id,"comment",body);}}><input value={commentDrafts[ad.id]||""} onChange={e=>setCommentDrafts(old=>({...old,[ad.id]:e.target.value}))} maxLength={1000} placeholder="Andika comment yako..."/><button disabled={!commentDrafts[ad.id]?.trim()}><Send size={16}/></button></form></div>}
    {role==="ADMIN"&&ad.status!=="APPROVED"&&<div className="campus-ad-moderation"><button onClick={()=>void moderate(ad.id,"APPROVED")}>Approve</button><button onClick={()=>void moderate(ad.id,"REJECTED")}>Reject</button></div>}
   </article>)}
  </main>
  <aside className="campus-ads-sidebar">
   <section className="campus-ad-compose"><span className="eyebrow">YOUR CAMPUS BUSINESS</span><h3>Weka tangazo lako</h3><p>Share huduma, bidhaa, event au kipaji chako. Hakuna budget wala malipo.</p>
    <form onSubmit={submit}><label>Jina la biashara / huduma<input required minLength={2} maxLength={100} value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Mf. Sam Digital Services"/></label>
     <label>Kichwa cha tangazo<input required minLength={3} maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Unatangaza nini?"/></label>
     <label>Maelezo<textarea required minLength={10} maxLength={1000} rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Eleza bidhaa au huduma yako..."/></label>
     <label>Kiungo cha picha/video (si lazima)<input type="url" value={form.mediaUrl} onChange={e=>setForm({...form,mediaUrl:e.target.value})} placeholder="https://..."/></label>
     <label>Mawasiliano<input required maxLength={100} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="+255... au email"/></label>
     {error&&<p className="form-error">{error}</p>}{message&&<p className="campus-ad-feedback">{message}</p>}
     <button className="campus-ad-submit" disabled={busy}><Send size={16}/>{busy?"Inatuma...":"Chapisha tangazo bure"}</button>
    </form><div className="campus-ad-free-note"><ShieldCheck size={16}/><span><b>Hakuna gharama.</b> Hakuna budget, hakuna malipo. Tangazo hupitia ukaguzi mfupi kabla ya kuonekana kwa wote.</span></div>
   </section>
   <div className="campus-ad-side-tip"><ImageIcon size={18}/><b>Kidokezo cha matangazo bora</b><p>Tumia picha au video safi, kichwa kifupi na maelezo yanayoeleweka ili kuvutia wanafunzi.</p></div>
  </aside></div>
 </section>;
}
