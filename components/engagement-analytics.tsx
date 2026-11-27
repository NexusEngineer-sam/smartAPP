"use client";
import { useEffect, useState } from "react";
import { Activity, Clock3, Eye, Users, BarChart3 } from "lucide-react";
type Metrics={periodDays:number;sessions:number;uniqueUsers:number;totalWatchSeconds:number;sponsoredViews:number;sponsoredVisibleSeconds:number;topPages:{pagePath:string;_sum:{durationSeconds:number|null};_count:{_all:number}}[]};
const duration=(s:number)=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h? h+"h "+m+"m":m+"m";};
export default function EngagementAnalytics({role}:{role:string}){
 const [data,setData]=useState<Metrics|null>(null);const [error,setError]=useState("");
 useEffect(()=>{if(role!=="ADMIN")return;let live=true;const load=async()=>{try{const r=await fetch("/api/engagement",{cache:"no-store"});if(!r.ok)throw new Error("Analytics unavailable");const d=await r.json();if(live)setData(d);}catch(e){if(live)setError(e instanceof Error?e.message:"Could not load analytics.");}};void load();const t=window.setInterval(load,30000);return()=>{live=false;window.clearInterval(t);};},[role]);
 if(role!=="ADMIN")return null;
 return <section className="surface-card" style={{marginTop:24}}>
  <div className="card-heading"><div><span className="eyebrow">MONETIZATION INTELLIGENCE · LAST 30 DAYS</span><h3><Activity size={18} style={{display:"inline",verticalAlign:"-3px",marginRight:8}}/>Engagement analytics</h3><p>Active usage and sponsored campaign exposure. Watch time is not ad revenue.</p></div><span className="secure-tag">Admin only</span></div>
  {error&&<p className="form-error">{error}</p>}
  <div className="hero-stats" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(135px,1fr))",gap:12}}>
   <div><Users size={18}/><b>{data?.uniqueUsers??"—"}</b><small>Unique active users</small></div>
   <div><Activity size={18}/><b>{data?.sessions??"—"}</b><small>Sessions</small></div>
   <div><Clock3 size={18}/><b>{data?duration(data.totalWatchSeconds):"—"}</b><small>Total watch time</small></div>
   <div><Eye size={18}/><b>{data?.sponsoredViews??"—"}</b><small>Sponsored views</small></div>
  </div>
  <div style={{marginTop:18}}><b style={{fontSize:14}}><BarChart3 size={15} style={{display:"inline",verticalAlign:"-2px",marginRight:6}}/>Most-used pages</b>
   {!data?.topPages?.length?<p style={{fontSize:13,color:"var(--muted,#7b8496)"}}>Analytics zitaonekana baada ya watumiaji kuanza kutumia mfumo.</p>:data.topPages.map(p=><div key={p.pagePath} className="transaction" style={{marginTop:8}}><span className="transaction-name"><b>{p.pagePath}</b><small>{p._count._all} sessions</small></span><strong>{duration(p._sum.durationSeconds||0)}</strong></div>)}
  </div>
  <p style={{fontSize:12,color:"var(--muted,#7b8496)",marginTop:14}}>Ad network: haijaunganishwa bado. Tutahitaji publisher account, site/app approval na ad-unit IDs kabla ya matangazo ya mtandao kuanza kuonyesha mapato.</p>
 </section>;
}
