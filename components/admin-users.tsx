"use client";
import { useEffect, useState } from "react";
import { Shield, Users, UserCheck, UserX } from "lucide-react";
type User = { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string };
type Metrics = { totalUsers:number; totalStudents:number; totalLecturers:number; totalReps:number; totalAdmins:number };
export default function AdminUsers() {
 const [users,setUsers]=useState<User[]>([]);
 const [metrics,setMetrics]=useState<Metrics>({totalUsers:0,totalStudents:0,totalLecturers:0,totalReps:0,totalAdmins:0});
 const [error,setError]=useState("");const [busy,setBusy]=useState("");
 async function load(){const r=await fetch("/api/admin/users",{cache:"no-store"});const d=await r.json();if(!r.ok){setError(d.error||"Could not load users.");return;}setUsers(d.users);setMetrics(d.metrics);}
 useEffect(()=>{void load();},[]);
 async function update(user:User,changes:{isActive?:boolean;role?:string}){
  setBusy(user.id);setError("");
  try{const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,...changes})});const d=await r.json();if(!r.ok)throw new Error(d.error);setUsers(list=>list.map(x=>x.id===user.id?{...x,...d.user}:x));await load();}
  catch(e){setError(e instanceof Error?e.message:"Update failed.");}finally{setBusy("");}
 }
 return <><div className="admin-metrics"><div><Users/><span>Total accounts</span><b>{metrics.totalUsers}</b></div><div><UserCheck/><span>Students</span><b>{metrics.totalStudents}</b></div><div><Shield/><span>Staff / Admin</span><b>{metrics.totalLecturers+metrics.totalReps+metrics.totalAdmins}</b></div></div>
 <section className="admin-table-card"><div className="card-heading"><div><h3>Account directory</h3><p>Manage account permissions, roles and platform access.</p></div></div>{error&&<p className="form-error">{error}</p>}
 <div className="table-scroll"><table><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>ACCESS</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b><small>{u.email}</small></td><td><select className="role-select" aria-label={"Role for "+u.name} value={u.role} disabled={busy===u.id} onChange={e=>void update(u,{role:e.target.value})}><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option><option value="CLASS_REP">Class rep</option><option value="ADMIN">Admin</option></select></td><td><span className={u.isActive?"status-active":"status-inactive"}>{u.isActive?"Active":"Suspended"}</span></td><td><button className="table-action" disabled={busy===u.id} onClick={()=>void update(u,{isActive:!u.isActive})}>{u.isActive?<><UserX size={14}/> Suspend</>:<><UserCheck size={14}/> Activate</>}</button></td></tr>)}</tbody></table>{users.length===0&&<div className="empty-state">No accounts found.</div>}</div></section></>;
}
