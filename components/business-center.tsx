"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Megaphone, Send, ShieldCheck, Clock3 } from "lucide-react";

type Campaign = { id:string; businessName:string; title:string; description:string; contact:string; budgetTzs:number; status:"PENDING"|"APPROVED"|"REJECTED"; createdAt:string; advertiserId?:string };
const money=(n:number)=>new Intl.NumberFormat("en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(n);

export default function BusinessCenter({ role }:{role:string}) {
  const [items,setItems]=useState<Campaign[]>([]);
  const [form,setForm]=useState({businessName:"",title:"",description:"",contact:"",budgetTzs:""});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load(){
    const r=await fetch("/api/business-center",{cache:"no-store"});
    if(r.ok){const d=await r.json();setItems(d.campaigns||[]);}
  }
  useEffect(()=>{void load();},[]);

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");setMessage("");
    try{
      const r=await fetch("/api/business-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,budgetTzs:Number(form.budgetTzs)})});
      const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not submit advert.");
      setMessage("Tangazo limepokelewa. Litasubiri ukaguzi wa administrator kabla ya kuonekana kwa wanafunzi.");
      setForm({businessName:"",title:"",description:"",contact:"",budgetTzs:""});await load();
    }catch(e){setError(e instanceof Error?e.message:"Something went wrong.");}finally{setBusy(false);}
  }
  async function moderate(id:string,status:"APPROVED"|"REJECTED"){
    const r=await fetch("/api/business-center",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});
    if(r.ok)await load();else setError("Could not update campaign.");
  }

  return <section className="surface-card" id="business-center" style={{marginTop:24}}>
    <div className="card-heading"><div><span className="eyebrow">CAMPUS COMMERCE</span><h3><BriefcaseBusiness size={19} style={{display:"inline",verticalAlign:"-4px",marginRight:8}}/>Business Center</h3><p>Matangazo ya biashara na huduma zinazohudumia jamii ya chuo.</p></div><span className="secure-tag"><ShieldCheck size={14}/> Reviewed adverts</span></div>
    <div className="notice-list" style={{marginBottom:18}}>
      {items.filter(x=>x.status==="APPROVED" || role==="ADMIN" || x.status!=="APPROVED").length===0?<div className="empty-state compact"><Megaphone size={24}/><b>Hakuna matangazo bado</b><span>Matangazo yaliyoidhinishwa yataonekana hapa.</span></div>:items.map(x=><article className="notice" key={x.id}>
        <span className="notice-mark"><Megaphone size={16}/></span><div style={{flex:1,minWidth:0}}><b>{x.title}</b><p>{x.description}</p><small>{x.businessName} · {x.contact} · Bajeti: {money(x.budgetTzs)}</small><div style={{marginTop:7,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><small><Clock3 size={12} style={{display:"inline",verticalAlign:"-2px"}}/> {x.status==="APPROVED"?"Imeidhinishwa":x.status==="REJECTED"?"Imekataliwa":"Inasubiri ukaguzi"}</small>{role==="ADMIN"&&x.status!=="APPROVED"&&<button className="text-action" onClick={()=>void moderate(x.id,"APPROVED")}>Approve</button>}{role==="ADMIN"&&x.status!=="REJECTED"&&<button className="text-action" onClick={()=>void moderate(x.id,"REJECTED")}>Reject</button>}</div></div>
      </article>)}
    </div>
    <form onSubmit={submit} style={{display:"grid",gap:12}}>
      <div><span className="eyebrow">PROMOTE YOUR BUSINESS</span><h3 style={{margin:"5px 0 0"}}>Weka tangazo jipya</h3><p style={{margin:"5px 0 0",color:"var(--muted,#7b8496)",fontSize:13}}>Jaza taarifa; tangazo litakaguliwa kabla ya kuchapishwa.</p></div>
      <label>Jina la biashara<input required minLength={2} maxLength={100} value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Mf. Samwel Digital Services"/></label>
      <label>Kichwa cha tangazo<input required minLength={3} maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Huduma au bidhaa unayotangaza"/></label>
      <label>Maelezo<textarea required minLength={10} maxLength={1000} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Eleza huduma, ofa au bidhaa yako..."/></label>
      <label>Mawasiliano (simu au email)<input required maxLength={100} value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="+255... au email"/></label>
      <label>Bajeti ya tangazo (TSh)<input required type="number" min="5000" max="100000000" step="1000" value={form.budgetTzs} onChange={e=>setForm({...form,budgetTzs:e.target.value})} placeholder="50000"/></label>
      {error&&<p className="form-error">{error}</p>}{message&&<p role="status" style={{color:"#15966b",fontSize:13}}>{message}</p>}
      <button className="primary-btn" disabled={busy}><Send size={16} style={{display:"inline",verticalAlign:"-3px",marginRight:7}}/>{busy?"Inatuma...":"Wasilisha tangazo"}</button>
    </form>
    <p style={{fontSize:12,color:"var(--muted,#7b8496)",marginTop:12}}>Muhimu: kuweka bajeti hapa ni taarifa ya ombi tu; si malipo. Malipo ya Mobile Money yatawashwa baada ya kuunganisha payment gateway na kufanya majaribio.</p>
  </section>;
}
