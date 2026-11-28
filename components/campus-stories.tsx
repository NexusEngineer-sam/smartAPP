"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, ImagePlus, Video, Send, ChevronRight, LoaderCircle, Clock3 } from "lucide-react";

type Story = { id:string; content:string; mediaUrl:string|null; mediaType:"image"|"video"|null; createdAt:string; expiresAt:string; authorId:string; authorName:string; authorAvatar?:string|null };
type Props = { user:{id?:string;name:string;avatarUrl?:string|null} };

export default function CampusStories({user}:Props) {
  const [stories,setStories]=useState<Story[]>([]);
  const [open,setOpen]=useState(false);
  const [viewing,setViewing]=useState<Story|null>(null);
  const [content,setContent]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const initials=user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

  async function load(){try{const r=await fetch("/api/stories",{cache:"no-store"});const d=await r.json();if(r.ok)setStories(d.stories||[]);}catch{}}
  useEffect(()=>{void load();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},10000);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  function choose(next:File|null){if(preview)URL.revokeObjectURL(preview);setPreview("");setFile(null);if(!next)return;if(!next.type.startsWith("image/")&&!next.type.startsWith("video/")){setError("Chagua picha au video.");return;}const limit=next.type.startsWith("video/")?100:12;if(next.size>limit*1024*1024){setError("Faili imezidi "+limit+" MB.");return;}setFile(next);setPreview(URL.createObjectURL(next));setError("");}
  async function publish(e:React.FormEvent){e.preventDefault();if((!content.trim()&&!file)||busy)return;setBusy(true);setError("");try{let mediaUrl:string|null=null;let mediaType:"image"|"video"|null=null;if(file){const sr=await fetch("/api/social/media-signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceType:file.type.startsWith("video/")?"video":"image",folder:"campus-stories"})});const sig=await sr.json();if(!sr.ok)throw new Error(sig.error||"Media upload is unavailable.");const form=new FormData();form.append("file",file);form.append("api_key",sig.apiKey);form.append("timestamp",String(sig.timestamp));form.append("folder",sig.folder);form.append("signature",sig.signature);const upload=await fetch("https://api.cloudinary.com/v1_1/"+sig.cloudName+"/"+sig.resourceType+"/upload",{method:"POST",body:form});const media=await upload.json();if(!upload.ok)throw new Error(media.error?.message||"Upload failed.");mediaUrl=media.secure_url;mediaType=sig.resourceType;}
const r=await fetch("/api/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,mediaUrl,mediaType})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Status haijachapishwa.");setStories(v=>[d.story,...v.filter(s=>s.authorId!==d.story.authorId)]);setContent("");setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview("");setOpen(false);if(inputRef.current)inputRef.current.value="";}catch(e){setError(e instanceof Error?e.message:"Status haijachapishwa.");}finally{setBusy(false);}}
  return <section className="campus-stories">
    <div className="campus-stories-heading"><div><span className="social-kicker">CAMPUS STORIES</span><h3>Status za saa 24</h3></div><span><Clock3 size={13}/> Huisha baada ya saa 24</span></div>
    <div className="campus-stories-rail">
      <button type="button" className="campus-story-tile create" onClick={()=>setOpen(true)}><span className="campus-story-ring own"><span className="campus-story-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:initials}</span><i><Plus size={15}/></i></span><b>Story yako</b><small>Ongeza status</small></button>
      {stories.map(story=><button type="button" className="campus-story-tile" key={story.id} onClick={()=>setViewing(story)}><span className="campus-story-ring"><span className="campus-story-avatar">{story.mediaUrl&&story.mediaType==="image"?<img src={story.mediaUrl} alt=""/>:story.authorAvatar?<img src={story.authorAvatar} alt=""/>:story.authorName.slice(0,1).toUpperCase()}</span></span><b>{story.authorId===user.id?"Story yako":story.authorName.split(" ")[0]}</b><small>{new Date(story.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></button>)}
      {stories.length===0&&<div className="campus-stories-empty">Hakuna status mpya. Kuwa wa kwanza kushare.</div>}
    </div>
    {open&&<div className="campus-story-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}><form className="campus-story-compose" onSubmit={publish}><header><div><span className="social-kicker">SHARE A MOMENT</span><h3>Weka status yako</h3></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close"><X/></button></header><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={500} placeholder="Unaendeleaje leo? Share na campus…"/>{preview&&<div className="campus-story-preview">{file?.type.startsWith("video/")?<video src={preview} controls/>:<img src={preview} alt="Story preview"/>}</div>}<div className="campus-story-actions"><button type="button" onClick={()=>{if(inputRef.current){inputRef.current.accept="image/*";inputRef.current.click();}}}><ImagePlus size={17}/> Picha</button><button type="button" onClick={()=>{if(inputRef.current){inputRef.current.accept="video/*";inputRef.current.click();}}}><Video size={17}/> Video</button><input ref={inputRef} type="file" hidden onChange={e=>choose(e.target.files?.[0]||null)}/><small>{content.length}/500 · Picha 12 MB · Video 100 MB</small></div>{error&&<p className="social-error">{error}</p>}<button className="campus-story-publish" disabled={busy||(!content.trim()&&!file)}>{busy?<><LoaderCircle size={16}/> Inachapisha…</>:<><Send size={16}/> Chapisha status</>}</button></form></div>}
    {viewing&&<div className="campus-story-viewer" onClick={()=>setViewing(null)}><button className="campus-story-viewer-close" aria-label="Close"><X/></button><div className="campus-story-viewer-card" onClick={e=>e.stopPropagation()}><div className="campus-story-progress"><i/></div><div className="campus-story-viewer-author"><span className="campus-story-avatar">{viewing.authorAvatar?<img src={viewing.authorAvatar} alt=""/>:viewing.authorName.slice(0,1)}</span><b>{viewing.authorName}</b><small>{new Date(viewing.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div>{viewing.mediaUrl&&viewing.mediaType==="video"?<video src={viewing.mediaUrl} controls autoPlay playsInline/>:viewing.mediaUrl?<img src={viewing.mediaUrl} alt="Story"/>:<div className="campus-story-text">{viewing.content}</div>}{viewing.mediaUrl&&viewing.content&&<p>{viewing.content}</p>}</div></div>}
  </section>;
}
