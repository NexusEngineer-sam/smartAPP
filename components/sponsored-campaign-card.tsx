"use client";
import { useEffect, useRef } from "react";
import { Megaphone, Clock3 } from "lucide-react";
type Campaign={id:string;businessName:string;title:string;description:string;contact:string;budgetTzs:number;status:"PENDING"|"APPROVED"|"REJECTED";createdAt:string};
const money=(n:number)=>new Intl.NumberFormat("en-TZ",{style:"currency",currency:"TZS",maximumFractionDigits:0}).format(n);
export default function SponsoredCampaignCard({campaign,admin,onModerate}:{campaign:Campaign;admin:boolean;onModerate:(id:string,status:"APPROVED"|"REJECTED")=>void}){
 const ref=useRef<HTMLElement|null>(null);
 useEffect(()=>{
  if(campaign.status!=="APPROVED"||!ref.current)return;
  let visible=false;const observer=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting&&e.intersectionRatio>=0.5);},{threshold:[0,0.5,1]});
  observer.observe(ref.current);
  const timer=window.setInterval(()=>{if(visible)void fetch("/api/sponsored-views",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({campaignId:campaign.id})});},15000);
  return()=>{observer.disconnect();window.clearInterval(timer);};
 },[campaign.id,campaign.status]);
 return <article ref={ref} className="notice">
  <span className="notice-mark"><Megaphone size={16}/></span><div style={{flex:1,minWidth:0}}><b>{campaign.title}</b><p>{campaign.description}</p><small>{campaign.businessName} · {campaign.contact} · Bajeti: {money(campaign.budgetTzs)}</small><div style={{marginTop:7,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><small><Clock3 size={12} style={{display:"inline",verticalAlign:"-2px"}}/> {campaign.status==="APPROVED"?"Imeidhinishwa":campaign.status==="REJECTED"?"Imekataliwa":"Inasubiri ukaguzi"}</small>{admin&&campaign.status!=="APPROVED"&&<button className="text-action" onClick={()=>onModerate(campaign.id,"APPROVED")}>Approve</button>}{admin&&campaign.status!=="REJECTED"&&<button className="text-action" onClick={()=>onModerate(campaign.id,"REJECTED")}>Reject</button>}</div></div>
 </article>;
}
