"use client";
import { FormEvent, useEffect, useState } from "react";
import { Megaphone, CalendarClock, ScrollText, Plus, Power, RefreshCw, Wallet, Database, CalendarDays, BadgeCheck } from "lucide-react";

type Announcement = { id: string; title: string; body: string; published: boolean; createdAt: string };
type Student = { id: string; name: string; email: string };
type Event = { id: string; title: string; courseCode: string|null; location: string|null; startsAt: string; endsAt: string; isActive: boolean; recipients: {userId:string}[] };
type Log = { id:string; action:string; entityType:string; entityId:string; createdAt:string; actor:{name:string;email:string} };
type CampusEvent = { id:string; title:string; description:string; category:string; venue:string; startsAt:string; endsAt:string; organizerName:string; status:"PENDING"|"APPROVED"|"REJECTED"; attendeeCount:number; organizer:{name:string;email:string;role:string} };
type Tab = "announcements"|"timetable"|"events"|"audit"|"data-to-cash";
type DataCash = { periodDays:number; usage:{totalBytes:string;totalGiB:number;eventCount:number;note:string;sources:{source:string;bytes:string;events:number}[]}; revenue:{confirmedTzs:number;confirmedEntries:number;pendingTzs:number;pendingEntries:number;reversedTzs:number}; campaigns:{status:string;count:number;declaredBudgetTzs:number}[]; recentEntries:{id:string;source:string;description:string;amountTzs:number;status:string;createdAt:string;confirmedAt:string|null}[] };

export default function AdminConsole(){
 const [tab,setTab]=useState<Tab>("announcements");
 const [announcements,setAnnouncements]=useState<Announcement[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [campusEvents,setCampusEvents]=useState<CampusEvent[]>([]);
 const [students,setStudents]=useState<Student[]>([]);
 const [logs,setLogs]=useState<Log[]>([]);
 const [dataCash,setDataCash]=useState<DataCash|null>(null);
 const [title,setTitle]=useState("");const [body,setBody]=useState("");const [published,setPublished]=useState(true);
 const [eventTitle,setEventTitle]=useState("");const [courseCode,setCourseCode]=useState("");const [location,setLocation]=useState("");
 const [startsAt,setStartsAt]=useState("");const [endsAt,setEndsAt]=useState("");const [reminderMins,setReminderMins]=useState(15);const [userIds,setUserIds]=useState<string[]>([]);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 async function load(){
  setError("");
  try{
   const [a,t,l,d,e]=await Promise.all([fetch("/api/admin/announcements",{cache:"no-store"}),fetch("/api/admin/timetable",{cache:"no-store"}),fetch("/api/admin/audit",{cache:"no-store"}),fetch("/api/admin/data-to-cash",{cache:"no-store"}),fetch("/api/admin/campus-events",{cache:"no-store"})]);
   const ad=await a.json(),td=await t.json(),ld=await l.json(),dd=await d.json(),ed=await e.json();
   if(!a.ok||!t.ok||!l.ok||!d.ok||!e.ok)throw new Error(ad.error||td.error||ld.error||dd.error||ed.error||"Unable to load control center data.");
   setAnnouncements(ad.announcements);setEvents(td.events);setStudents(td.students);setLogs(ld.logs);setDataCash(dd);setCampusEvents(ed.events);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load data.");}
 }
 useEffect(()=>{void load();},[]);
 async function saveAnnouncement(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{const r=await fetch("/api/admin/announcements",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,body,published})});const d=await r.json();if(!r.ok)throw new Error(d.error);setAnnouncements(x=>[d.announcement,...x]);setTitle("");setBody("");setNotice("Announcement published to the platform.");}
  catch(e){setError(e instanceof Error?e.message:"Could not save announcement.");}finally{setBusy(false);}
 }
 async function toggleAnnouncement(a:Announcement){
  const r=await fetch("/api/admin/announcements",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:a.id,published:!a.published})});const d=await r.json();if(!r.ok){setError(d.error);return;}setAnnouncements(x=>x.map(v=>v.id===a.id?d.announcement:v));setNotice(d.announcement.published?"Announcement published.":"Announcement moved to drafts.");
 }
 async function removeAnnouncement(id:string){
  if(!window.confirm("Delete this announcement permanently?"))return;
  const r=await fetch("/api/admin/announcements",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});const d=await r.json();if(!r.ok){setError(d.error);return;}setAnnouncements(x=>x.filter(a=>a.id!==id));setNotice("Announcement deleted.");
 }
 async function saveEvent(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{const r=await fetch("/api/admin/timetable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:eventTitle,courseCode:courseCode||null,location:location||null,startsAt:new Date(startsAt).toISOString(),endsAt:new Date(endsAt).toISOString(),reminderMins,userIds})});const d=await r.json();if(!r.ok)throw new Error(d.error);setEvents(x=>[d.event,...x]);setEventTitle("");setCourseCode("");setLocation("");setUserIds([]);setNotice("Timetable event created and assigned.");}
  catch(e){setError(e instanceof Error?e.message:"Could not create event.");}finally{setBusy(false);}
 }
 async function toggleEvent(event:Event){
  const r=await fetch("/api/admin/timetable",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:event.id,isActive:!event.isActive})});const d=await r.json();if(!r.ok){setError(d.error);return;}setEvents(x=>x.map(v=>v.id===event.id?{...v,isActive:d.event.isActive}:v));
 }
 function toggleStudent(id:string){setUserIds(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id]);}
 async function moderateCampusEvent(item:CampusEvent,status:"APPROVED"|"REJECTED"){
  setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/admin/campus-events",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,status})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not update event.");
   setCampusEvents(v=>v.map(x=>x.id===item.id?{...x,status}:x));
   setNotice(status==="APPROVED"?"Event approved and published to students.":"Event rejected.");
  }catch(e){setError(e instanceof Error?e.message:"Could not update event.");}
  finally{setBusy(false);}
 }
 return <section className="admin-console">
  <div className="admin-tabs">{([{id:"announcements",label:"Announcements",icon:<Megaphone size={15}/>},{id:"timetable",label:"Timetable",icon:<CalendarClock size={15}/>},{id:"events",label:"Campus Events",icon:<CalendarDays size={15}/>},{id:"audit",label:"Audit trail",icon:<ScrollText size={15}/>},{id:"data-to-cash",label:"Data-to-Cash",icon:<Wallet size={15}/>} ] as const).map(x=><button key={x.id} className={tab===x.id?"admin-tab active":"admin-tab"} onClick={()=>setTab(x.id)}>{x.icon}{x.label}</button>)}<button className="admin-refresh" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
  {error&&<p className="form-error">{error}</p>}{notice&&<p className="success-message">{notice}</p>}
  {tab==="announcements"&&<div className="admin-work-grid"><form className="admin-form-card" onSubmit={saveAnnouncement}><span className="eyebrow">CAMPUS COMMUNICATION</span><h3>Create announcement</h3><label>Headline<input required minLength={3} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Important campus update"/></label><label>Message<textarea required minLength={5} maxLength={5000} rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder="Write the official announcement…"/></label><label className="inline-check"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish immediately</label><button className="primary-btn" disabled={busy}><Plus size={15}/>{busy?"Saving…":"Save announcement"}</button></form><section className="admin-table-card"><div className="card-heading"><div><h3>Published & drafts</h3><p>{announcements.length} announcements</p></div></div>{announcements.map(a=><article className="admin-record" key={a.id}><div><b>{a.title}</b><p>{a.body}</p><small>{a.published?"Published":"Draft"} · {new Date(a.createdAt).toLocaleString()}</small></div><div className="record-actions"><button className="table-action" onClick={()=>void toggleAnnouncement(a)}>{a.published?"Unpublish":"Publish"}</button><button className="table-action danger-action" onClick={()=>void removeAnnouncement(a.id)}>Delete</button></div></article>)}{!announcements.length&&<div className="empty-state">No announcements created.</div>}</section></div>}
  {tab==="timetable"&&<div className="admin-work-grid"><form className="admin-form-card" onSubmit={saveEvent}><span className="eyebrow">ACADEMIC OPERATIONS</span><h3>Schedule a class</h3><label>Class / session title<input required minLength={3} value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="e.g. Introduction to Programming"/></label><div className="admin-form-row"><label>Course code<input value={courseCode} onChange={e=>setCourseCode(e.target.value)} placeholder="CS 101"/></label><label>Room / venue<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Lecture hall 2"/></label></div><label>Starts at<input type="datetime-local" required value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label><label>Ends at<input type="datetime-local" required value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label><label>Reminder lead time<select value={reminderMins} onChange={e=>setReminderMins(Number(e.target.value))}><option value={0}>No reminder</option><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={60}>1 hour</option></select></label><label>Assign students ({userIds.length} selected)</label><div className="student-picker">{students.map(s=><label key={s.id} className="student-option"><input type="checkbox" checked={userIds.includes(s.id)} onChange={()=>toggleStudent(s.id)}/><span><b>{s.name}</b><small>{s.email}</small></span></label>)}</div><button className="primary-btn" disabled={busy}><Plus size={15}/>{busy?"Creating…":"Create class event"}</button></form><section className="admin-table-card"><div className="card-heading"><div><h3>Scheduled sessions</h3><p>{events.length} events</p></div></div>{events.map(ev=><article className="admin-record" key={ev.id}><div><b>{ev.title}</b><p>{ev.courseCode||"No course code"} · {ev.location||"Venue TBC"}</p><small>{new Date(ev.startsAt).toLocaleString()} · {ev.recipients.length} students</small><small className={ev.isActive?"status-active":"status-inactive"}>{ev.isActive?"Active":"Cancelled"}</small></div><button className="table-action" onClick={()=>void toggleEvent(ev)}><Power size={13}/>{ev.isActive?"Cancel":"Activate"}</button></article>)}{!events.length&&<div className="empty-state">No sessions scheduled.</div>}</section></div>}
  {tab==="events"&&<section className="admin-table-card"><div className="card-heading"><div><span className="eyebrow">CAMPUS EVENT GOVERNANCE</span><h3>Event approval queue</h3><p>Review student, club and organizer submissions before publishing.</p></div><span className="secure-tag"><CalendarDays size={14}/> {campusEvents.filter(x=>x.status==="PENDING").length} pending</span></div>
   {campusEvents.map(item=><article className="admin-record" key={item.id}><div><b>{item.title}</b><p>{item.description}</p><small>{item.category} · {item.venue} · {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleString()}</small><small>Organizer: {item.organizerName} ({item.organizer.name} · {item.organizer.email}) · {item.attendeeCount} registered</small><small className={item.status==="APPROVED"?"status-active":"status-inactive"}>{item.status}</small></div><div className="record-actions">{item.status!=="APPROVED"&&<button className="table-action" disabled={busy} onClick={()=>void moderateCampusEvent(item,"APPROVED")}><BadgeCheck size={13}/> Approve</button>}{item.status!=="REJECTED"&&<button className="table-action danger-action" disabled={busy} onClick={()=>void moderateCampusEvent(item,"REJECTED")}>Reject</button>}</div></article>)}
   {!campusEvents.length&&<div className="empty-state">No event submissions yet.</div>}
  </section>}
  {tab==="data-to-cash"&&<div className="admin-work-grid">
   <section className="admin-table-card"><div className="card-heading"><div><span className="eyebrow">PRIVATE REVENUE INTELLIGENCE</span><h3>SAMWEL DATA-TO-CASH™</h3><p>Last 30 days · Admin-only financial view</p></div><button className="table-action" onClick={()=>void load()}><RefreshCw size={13}/> Refresh</button></div>
    <div className="admin-record"><div><b>Confirmed revenue</b><p>Cash entries explicitly marked CONFIRMED</p><strong>TSh {(dataCash?.revenue.confirmedTzs??0).toLocaleString()}</strong></div><small>{dataCash?.revenue.confirmedEntries??0} entries</small></div>
    <div className="admin-record"><div><b>Pending revenue</b><p>Not counted as collected cash</p><strong>TSh {(dataCash?.revenue.pendingTzs??0).toLocaleString()}</strong></div><small>{dataCash?.revenue.pendingEntries??0} pending</small></div>
    <div className="admin-record"><div><b>Reversed transactions</b><p>Excluded from confirmed revenue</p><strong>TSh {(dataCash?.revenue.reversedTzs??0).toLocaleString()}</strong></div></div>
   </section>
   <section className="admin-table-card"><div className="card-heading"><div><span className="eyebrow">PLATFORM ANALYTICS</span><h3><Database size={16}/> Data usage telemetry</h3><p>{dataCash?.usage.eventCount??0} events recorded in 30 days</p></div></div>
    <div className="admin-record"><div><b>Measured traffic</b><p>{(dataCash?.usage.totalGiB??0).toFixed(3)} GiB recorded</p></div></div>
    <p className="empty-state">{dataCash?.usage.note??"Usage telemetry is analytics only, not cash revenue."}</p>
    {(dataCash?.usage.sources??[]).map(source=><article className="admin-record" key={source.source}><div><b>{source.source}</b><small>{source.events} events · {(Number(source.bytes)/(1024**2)).toFixed(2)} MB</small></div></article>)}
   </section>
   <section className="admin-table-card"><div className="card-heading"><div><h3>Campaign pipeline</h3><p>Advertiser-declared budgets are not verified payments</p></div></div>
    {(dataCash?.campaigns??[]).map(item=><article className="admin-record" key={item.status}><div><b>{item.status}</b><small>{item.count} campaigns · Declared budget TSh {item.declaredBudgetTzs.toLocaleString()}</small></div></article>)}
    {!dataCash?.campaigns.length&&<div className="empty-state">No campaign records.</div>}
   </section>
   <section className="admin-table-card"><div className="card-heading"><div><h3>Revenue ledger</h3><p>Latest 10 entries · manual/provider verification required</p></div></div>
    {(dataCash?.recentEntries??[]).map(entry=><article className="admin-record" key={entry.id}><div><b>{entry.description}</b><small>{entry.source} · {new Date(entry.createdAt).toLocaleString()}</small><small className={entry.status==="CONFIRMED"?"status-active":"status-inactive"}>{entry.status}</small></div><strong>TSh {entry.amountTzs.toLocaleString()}</strong></article>)}
    {!dataCash?.recentEntries.length&&<div className="empty-state">Hakuna mapato yaliyorekodiwa bado. Hii ni hali sahihi mpaka malipo halisi yathibitishwe.</div>}
   </section>
  </div>}
  {tab==="audit"&&<section className="admin-table-card"><div className="card-heading"><div><h3>Administrator activity</h3><p>Latest 100 recorded management actions.</p></div></div><div className="table-scroll"><table><thead><tr><th>ADMIN</th><th>ACTION</th><th>RESOURCE</th><th>TIME</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td><b>{log.actor.name}</b><small>{log.actor.email}</small></td><td>{log.action}</td><td>{log.entityType}</td><td>{new Date(log.createdAt).toLocaleString()}</td></tr>)}</tbody></table>{!logs.length&&<div className="empty-state">No activity recorded yet.</div>}</div></section>}
 </section>;
}
