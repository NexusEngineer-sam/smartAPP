"use client";

import { useState } from "react";
import { Bell, CalendarDays, Clapperboard, Megaphone, Newspaper, Users, Layers3 } from "lucide-react";
import BusinessCenter from "@/components/business-center";
import CampusEventsHub from "@/components/campus-events-hub";
import CampusVideoHub from "@/components/campus-video-hub";
import SocialFeed from "@/components/social-feed";

type User = { id:string; name:string; email:string; role:string; avatarUrl?:string|null };
type Notice = { id:string; title:string; body:string; createdAt:string };
type Filter = "all"|"ads"|"news"|"events"|"videos"|"students";

const filters:{id:Filter;label:string;icon:typeof Layers3}[] = [
  {id:"all",label:"Vyote",icon:Layers3},
  {id:"ads",label:"Matangazo",icon:Megaphone},
  {id:"news",label:"Habari za chuo",icon:Newspaper},
  {id:"events",label:"Matukio",icon:CalendarDays},
  {id:"videos",label:"Video",icon:Clapperboard},
  {id:"students",label:"Posts za wanafunzi",icon:Users},
];

export default function CampusDiscoveryHub({user,notices}:{user:User;notices:Notice[]}) {
  const [active,setActive]=useState<Filter>("all");
  const show=(filter:Filter)=>active==="all"||active===filter;
  return <section className="discovery-hub">
    <header className="discovery-hero">
      <div><span className="discovery-kicker"><Layers3 size={14}/> CAMPUS DISCOVERY · ONE PLACE</span><h2>Kinachoendelea chuoni.</h2><p>Matangazo, habari rasmi, matukio, video na posts za wanafunzi — chagua unachotaka kuona.</p></div>
      <span className="discovery-hero-mark"><Bell size={25}/></span>
    </header>
    <nav className="discovery-filters" aria-label="Chuja maudhui ya campus">
      {filters.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={active===item.id?"selected":""} aria-pressed={active===item.id} onClick={()=>setActive(item.id)}><Icon size={16}/>{item.label}</button>;})}
    </nav>
    {show("news")&&<section className="discovery-news">
      <div className="discovery-section-heading"><div><span className="eyebrow">OFFICIAL CAMPUS UPDATES</span><h3>Habari na matangazo rasmi</h3></div><span className="discovery-count">{notices.length} updates</span></div>
      {notices.length===0?<div className="discovery-empty"><Newspaper size={24}/><b>Hakuna taarifa mpya kwa sasa</b><span>Matangazo rasmi yakichapishwa yataonekana hapa.</span></div>:<div className="discovery-news-list">{notices.map(n=><article className="discovery-news-card" key={n.id}><span className="discovery-news-icon"><Newspaper size={18}/></span><div><b>{n.title}</b><p>{n.body}</p><small><Bell size={12}/> Uongozi wa chuo · {new Date(n.createdAt).toLocaleString()}</small></div></article>)}</div>}
    </section>}
    {show("ads")&&<BusinessCenter role={user.role}/>}
    {show("events")&&<CampusEventsHub user={user}/>}
    {show("videos")&&<CampusVideoHub/>}
    {show("students")&&<SocialFeed user={user}/>}
    {active==="all"&&<div className="discovery-all-note"><span><Layers3 size={16}/></span><div><b>Unaangalia kila kitu</b><small>Matangazo, habari na maudhui mapya yanaonyeshwa kwa mpangilio wa makundi. Tumia vichujio hapo juu kufungua aina moja tu.</small></div></div>}
  </section>;
}
