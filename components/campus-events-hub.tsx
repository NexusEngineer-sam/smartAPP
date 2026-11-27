"use client";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Users, BadgeCheck, Plus, RefreshCw, X, Clock3, Send } from "lucide-react";

type CampusEvent = {
  id:string; title:string; description:string; category:string; venue:string;
  startsAt:string; endsAt:string; organizerName:string; contact:string|null;
  attendeeCount:number; joined:boolean; verified:boolean;
};
const dateLabel=(value:string)=>new Date(value).toLocaleString([], {weekday:"short",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});

export default function CampusEventsHub({user}:{user:{name:string;role:string}}){
 const [events,setEvents]=useState<CampusEvent[]>([]);
 const [loading,setLoading]=useState(true);
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [title,setTitle]=useState("");
 const [description,setDescription]=useState("");
 const [category,setCategory]=useState("Social");
 const [venue,setVenue]=useState("");
 const [startsAt,setStartsAt]=useState("");
 const [endsAt,setEndsAt]=useState("");
 const [organizerName,setOrganizerName]=useState(user.name);
 const [contact,setContact]=useState("");

 async function load(){
  setLoading(true);setError("");
  try{const r=await fetch("/api/campus-events",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load events.");setEvents(d.events||[]);}
  catch(e){setError(e instanceof Error?e.message:"Events unavailable.");}
  finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/campus-events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    title,description,category,venue,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),organizerName,contact:contact||null
   })});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not submit event.");
   setMessage(d.message);setOpen(false);setTitle("");setDescription("");setVenue("");setStartsAt("");setEndsAt("");setContact("");
   if(user.role==="ADMIN")await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not submit event.");}
  finally{setBusy(false);}
 }
 async function toggleJoin(event:CampusEvent){
  setEvents(v=>v.map(x=>x.id===event.id?{...x,joined:!x.joined,attendeeCount:Math.max(0,x.attendeeCount+(x.joined?-1:1))}:x));
  try{const r=await fetch("/api/campus-events",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId:event.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not update RSVP.");setEvents(v=>v.map(x=>x.id===event.id?{...x,joined:d.joined}:x));}
  catch(e){setEvents(v=>v.map(x=>x.id===event.id?{...x,joined:event.joined,attendeeCount:event.attendeeCount}:x));setError(e instanceof Error?e.message:"RSVP failed.");}
 }
 return <section className="campus-events">
  <div className="events-hero"><div><span className="events-kicker"><CalendarDays size={14}/> CAMPUS LIFE · WHAT'S HAPPENING</span><h2>Find your next moment.</h2><p>Discover campus meetups, workshops, sports, parties and student-led activities.</p></div><div className="events-hero-mark"><CalendarDays size={29}/></div></div>
  <div className="events-toolbar"><div><span className="eyebrow">CAMPUS CALENDAR</span><h3>Upcoming events</h3><small>Only events approved by campus administration appear here.</small></div><div className="events-toolbar-actions"><button type="button" className="events-refresh" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button><button type="button" className="events-create" onClick={()=>{setError("");setMessage("");setOpen(v=>!v);}}><Plus size={15}/> Submit event</button></div></div>
  {message&&<p className="events-success">{message}</p>}{error&&<p className="form-error">{error}</p>}
  {open&&<form className="events-form" onSubmit={submit}>
   <div className="events-form-head"><div><span className="eyebrow">EVENT SUBMISSION</span><h3>Tell the campus about it</h3><p>{user.role==="ADMIN"?"Admin events are published immediately.":"Your event will be reviewed before students can see it."}</p></div><button type="button" className="icon-btn" onClick={()=>setOpen(false)} aria-label="Close"><X/></button></div>
   <div className="events-form-grid">
    <label>Event title<input required minLength={4} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Tech & Innovation Night"/></label>
    <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{["Social","Academic","Career","Sports","Culture","Workshop","Entertainment","Other"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="events-full">Description<textarea required minLength={10} maxLength={2000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What will happen at this event? Who should attend?"/></label>
    <label>Venue<input required maxLength={160} value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Campus hall / location"/></label>
    <label>Organizer / club name<input required maxLength={120} value={organizerName} onChange={e=>setOrganizerName(e.target.value)} placeholder="Organizer name"/></label>
    <label>Starts at<input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
    <label>Ends at<input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label>
    <label className="events-full">Organizer contact (optional)<input maxLength={120} value={contact} onChange={e=>setContact(e.target.value)} placeholder="Phone, email or social handle"/></label>
   </div>
   <div className="events-form-footer"><small>{user.role==="ADMIN"?"This will be published as an official campus event.":"Submitting does not publish the event. An administrator must approve it first."}</small><button type="submit" disabled={busy}><Send size={15}/>{busy?"Submitting…":user.role==="ADMIN"?"Publish event":"Send for approval"}</button></div>
  </form>}
  {loading?<div className="events-empty"><RefreshCw/><span>Loading campus events…</span></div>:events.length===0?<div className="events-empty"><CalendarDays size={28}/><b>No upcoming events yet</b><span>When an event is approved, it will appear here for everyone.</span></div>:<div className="events-grid">{events.map(event=><article className="event-card" key={event.id}>
   <div className="event-card-top"><span className="event-category">{event.category}</span>{event.verified?<span className="event-official"><BadgeCheck size={13}/> Official campus</span>:<span className="event-approved"><BadgeCheck size={13}/> Approved</span>}</div>
   <h3>{event.title}</h3><p className="event-description">{event.description}</p>
   <div className="event-meta"><span><CalendarDays size={15}/>{dateLabel(event.startsAt)}</span><span><Clock3 size={15}/>{dateLabel(event.endsAt)}</span><span><MapPin size={15}/>{event.venue}</span><span><Users size={15}/>{event.attendeeCount} attending</span></div>
   <div className="event-card-footer"><div><b>{event.organizerName}</b><small>Organizer</small></div><button type="button" className={event.joined?"event-joined":"event-join"} onClick={()=>void toggleJoin(event)}>{event.joined?"Going ✓":"Join event"}</button></div>
  </article>)}</div>}
 </section>;
}
