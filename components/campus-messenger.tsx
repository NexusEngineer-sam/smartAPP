"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {MessageCircle,Search,Send,ArrowLeft,Plus,Users,CheckCheck} from "lucide-react";
type Person={id:string;name:string;avatarUrl:string|null;university?:string|null;course?:string|null;online?:boolean;lastSeenAt?:string|null};
type Message={id:string;body:string;createdAt:string;sender:{id:string;name:string;avatarUrl:string|null}};
type Conversation={id:string;isGroup:boolean;title:string|null;updatedAt:string;otherUsers:Person[];lastMessage:Message|null};
function presenceLabel(person?:Person){if(!person)return "Campus conversation";if(person.online)return "Active now";if(!person.lastSeenAt)return "Offline";const mins=Math.max(1,Math.floor((Date.now()-new Date(person.lastSeenAt).getTime())/60000));return mins<60?`Active ${mins}m ago`:`Last active ${new Date(person.lastSeenAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;}
export default function CampusMessenger({currentUser}:{currentUser:{id?:string;name:string}}){
 const [conversations,setConversations]=useState<Conversation[]>([]);
 const [users,setUsers]=useState<Person[]>([]);
 const [incomingRequests,setIncomingRequests]=useState<Conversation[]>([]);
 const [outgoingRequests,setOutgoingRequests]=useState<Conversation[]>([]);
 const [query,setQuery]=useState("");
 const [selected,setSelected]=useState<Conversation|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [peerReadAt,setPeerReadAt]=useState<string|null>(null);
 const [draft,setDraft]=useState("");
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [mobileChat,setMobileChat]=useState(false);
 const activeName=useMemo(()=>selected?.title||selected?.otherUsers.map(x=>x.name).join(", ")||"Conversation",[selected]);
 const load=useCallback(async()=>{
  try{const r=await fetch("/api/messenger"+(query.trim()?"?q="+encodeURIComponent(query.trim()):""),{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load messages.");setConversations(d.conversations||[]);setIncomingRequests(d.incomingRequests||[]);setOutgoingRequests(d.outgoingRequests||[]);setUsers(d.users||[]);setSelected(previous=>previous?((d.conversations||[]).find((item:Conversation)=>item.id===previous.id)||previous):null);}
  catch(e){setError(e instanceof Error?e.message:"Messenger unavailable.");}finally{setLoading(false);}
 },[query]);
 useEffect(()=>{const t=window.setTimeout(()=>void load(),250);return()=>window.clearTimeout(t)},[load]);
 useEffect(()=>{const t=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);return()=>window.clearInterval(t)},[load]);
 const loadMessages=useCallback(async(id:string)=>{
  try{const r=await fetch("/api/messenger/"+id+"/messages",{cache:"no-store"});const d=await r.json();if(r.ok){setMessages(d.messages||[]);setPeerReadAt(d.peerReadAt||null);}}
  catch{/* transient connection issue */ }
 },[]);
 useEffect(()=>{if(!selected)return;void loadMessages(selected.id);const t=window.setInterval(()=>void loadMessages(selected.id),5000);return()=>window.clearInterval(t)},[selected?.id,loadMessages]);
 async function startChat(person:Person){
  setError("");try{const r=await fetch("/api/messenger",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({recipientId:person.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not send request.");await load();setQuery("");if(d.pending){setError("Message request sent. Chat opens after they accept.");return;}const conversation:Conversation={id:d.conversationId,isGroup:false,title:null,updatedAt:new Date().toISOString(),otherUsers:[person],lastMessage:null};setSelected(conversation);setMessages([]);setMobileChat(true);}
  catch(e){setError(e instanceof Error?e.message:"Could not send request.");}
 }
 async function respondToRequest(id:string,action:"accept"|"decline"){
  setError("");try{const r=await fetch("/api/messenger/"+id+"/request",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not update request.");await load();if(action==="accept"){const c=(d.conversation||incomingRequests.find(x=>x.id===id));if(c){setSelected(c);setMessages([]);setMobileChat(true);}}}
  catch(e){setError(e instanceof Error?e.message:"Could not update request.");}
 }
 async function sendMessage(e:React.FormEvent){
  e.preventDefault();if(!selected||!draft.trim()||sending)return;setSending(true);setError("");
  try{const r=await fetch("/api/messenger/"+selected.id+"/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:draft.trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Message not sent.");setMessages(v=>[...v,d.message]);setDraft("");void load();}
  catch(e){setError(e instanceof Error?e.message:"Message not sent.");}finally{setSending(false);}
 }
 return <section className="campus-messenger">
  <header className="messenger-hero"><span><MessageCircle size={25}/></span><div><small>CONNECTED CAMPUS COMMUNITY</small><h2>Campus Messenger</h2><p>Private conversations with students across your campus network.</p></div><b>PRIVATE</b></header>
  {error&&<p className="messenger-error">{error}</p>}
  <div className="messenger-layout">
   <aside className={mobileChat?"messenger-sidebar hide-mobile":"messenger-sidebar"}>
    <div className="messenger-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find students or chats…"/></div>
    {query.trim().length>=2&&users.length>0&&<div className="messenger-search-results"><small>STUDENTS · SEND REQUEST FIRST</small>{users.map(p=>{const sent=outgoingRequests.some(x=>x.otherUsers.some(y=>y.id===p.id));return <button key={p.id} onClick={()=>!sent&&void startChat(p)} disabled={sent}><span className="messenger-avatar">{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:p.name.slice(0,1)}<i className={p.online?"is-online":""}/></span><span><b>{p.name}</b><small>{p.online?"Active now":([p.course,p.university].filter(Boolean).join(" · ")||presenceLabel(p))}</small></span>{sent?<small>Request sent</small>:<Plus size={16}/>}</button>})}</div>}
    {incomingRequests.length>0&&<div className="messenger-search-results"><small>MESSAGE REQUESTS · {incomingRequests.length}</small>{incomingRequests.map(c=>{const p=c.otherUsers[0];return <div className="messenger-request-card" key={c.id}><b>{p?.name||"Student"}</b><small>Wants to start a private chat</small><div><button onClick={()=>void respondToRequest(c.id,"accept")}>Accept</button><button onClick={()=>void respondToRequest(c.id,"decline")}>Decline</button></div></div>})}</div>}
    {outgoingRequests.length>0&&<div className="messenger-list-heading"><b>Requests sent</b><small>{outgoingRequests.length}</small></div>}
    <div className="messenger-list-heading"><b>Recent chats</b><small>{conversations.length}</small></div>
    {loading?<p className="messenger-empty">Loading conversations…</p>:conversations.length===0?<p className="messenger-empty">No conversations yet. Search for a student to say hello.</p>:conversations.map(c=>{const name=c.title||c.otherUsers.map(x=>x.name).join(", ")||"Campus chat";return <button key={c.id} className={"messenger-conversation "+(selected?.id===c.id?"active":"")} onClick={()=>{setSelected(c);setMobileChat(true)}}><span className="messenger-avatar">{c.otherUsers[0]?.avatarUrl?<img src={c.otherUsers[0].avatarUrl} alt=""/>:name.slice(0,1)}<i className={c.otherUsers.some(x=>x.online)?"is-online":""}/></span><span className="messenger-conversation-copy"><b>{name}</b><small>{c.otherUsers[0]?.online?<em className="messenger-list-online">● Active now</em>:(c.lastMessage?.body||presenceLabel(c.otherUsers[0]))}</small></span><small className="messenger-time">{c.lastMessage?new Date(c.lastMessage.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""}</small></button>})}
   </aside>
   <div className={mobileChat?"messenger-chat":"messenger-chat empty-chat"}>
    {selected?<><header className="messenger-chat-head"><button className="messenger-back" onClick={()=>setMobileChat(false)}><ArrowLeft size={18}/></button><span className="messenger-avatar">{selected.otherUsers[0]?.avatarUrl?<img src={selected.otherUsers[0].avatarUrl} alt=""/>:activeName.slice(0,1)}<i className={selected.otherUsers.some(x=>x.online)?"is-online":""}/></span><div className="messenger-head-copy"><b>{activeName}</b><small><i className={selected.otherUsers.some(x=>x.online)?"messenger-status-dot online":"messenger-status-dot"}/>{selected.isGroup?"Group conversation":presenceLabel(selected.otherUsers[0])}</small></div></header>
      <div className="messenger-messages">{messages.length===0?<div className="messenger-empty-chat"><MessageCircle size={28}/><b>Start a conversation</b><span>Say hello and make a new campus connection.</span></div>:messages.map(m=><div key={m.id} className={"messenger-bubble-row "+(m.sender.id===currentUser.id?"mine":"theirs")}><article className="messenger-bubble"><p>{m.body}</p><small>{new Date(m.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {m.sender.id===currentUser.id&&<><CheckCheck size={12}/>{messages[messages.length-1]?.id===m.id&&peerReadAt&&new Date(peerReadAt).getTime()>=new Date(m.createdAt).getTime()&&<span className="messenger-seen-label">Seen</span>}</>}</small></article></div>)}</div>
      <form className="messenger-compose" onSubmit={sendMessage}><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000} rows={1}/><button disabled={!draft.trim()||sending}><Send size={18}/></button></form>
    </>:<div className="messenger-empty-chat"><MessageCircle size={36}/><b>Your campus conversations, in one place</b><span>Choose a conversation or search for a student to start chatting.</span><div className="messenger-encryption-note"><Users size={15}/> Send a message request first. The other student must accept before chatting.</div></div>}
   </div>
  </div>
 </section>;
}
