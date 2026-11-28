"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, ImagePlus, Video, Send, LoaderCircle, Clock3, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

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

  const groups=useMemo(()=>{
    const map=new Map<string,{authorId:string;authorName:string;authorAvatar?:string|null;stories:Story[]}>();
    for(const story of [...stories].sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())){
      const group=map.get(story.authorId);
      if(group)group.stories.push(story);
      else map.set(story.authorId,{authorId:story.authorId,authorName:story.authorName,authorAvatar:story.authorAvatar,stories:[story]});
    }
    return [...map.values()].sort((a,b)=>new Date(b.stories[b.stories.length-1].createdAt).getTime()-new Date(a.stories[a.stories.length-1].createdAt).getTime());
  },[stories]);
  const ownGroup=groups.find(g=>g.authorId===user.id);
  const viewingGroup= viewing ? groups.find(g=>g.authorId===viewing.authorId) : undefined;
  const viewingIndex=viewingGroup?.stories.findIndex(s=>s.id===viewing?.id) ?? -1;

  function choose(next:File|null){if(preview)URL.revokeObjectURL(preview);setPreview("");setFile(null);if(!next)return;if(!next.type.startsWith("image/")&&!next.type.startsWith("video/")){setError("Chagua picha au video.");return;}const limit=next.type.startsWith("video/")?100:12;if(next.size>limit*1024*1024){setError("Faili imezidi "+limit+" MB.");return;}setFile(next);setPreview(URL.createObjectURL(next));setError("");}
  async function publish(e:React.FormEvent){e.preventDefault();if((!content.trim()&&!file)||busy)return;setBusy(true);setError("");try{let mediaUrl:string|null=null;let mediaType:"image"|"video"|null=null;if(file){const sr=await fetch("/api/social/media-signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceType:file.type.startsWith("video/")?"video":"image",folder:"campus-stories"})});const sig=await sr.json();if(!sr.ok)throw new Error(sig.error||"Media upload is unavailable.");const form=new FormData();form.append("file",file);form.append("api_key",sig.apiKey);form.append("timestamp",String(sig.timestamp));form.append("folder",sig.folder);form.append("signature",sig.signature);const upload=await fetch("https://api.cloudinary.com/v1_1/"+sig.cloudName+"/"+sig.resourceType+"/upload",{method:"POST",body:form});const media=await upload.json();if(!upload.ok)throw new Error(media.error?.message||"Upload failed.");mediaUrl=media.secure_url;mediaType=sig.resourceType;}
    const r=await fetch("/api/stories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,mediaUrl,mediaType})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Status haijachapishwa.");
    setStories(v=>[d.story,...v]);setContent("");setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview("");setOpen(false);if(inputRef.current)inputRef.current.value="";
  }catch(e){setError(e instanceof Error?e.message:"Status haijachapishwa.");}finally{setBusy(false);}}
  async function deleteStory(story:Story){if(story.authorId!==user.id)return;if(!window.confirm("Una uhakika unataka kufuta status hii?"))return;setBusy(true);try{const r=await fetch("/api/stories",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({storyId:story.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Imeshindikana kufuta status.");const remaining=stories.filter(s=>s.id!==story.id);setStories(remaining);const next=remaining.find(s=>s.authorId===story.authorId);setViewing(next||null);}catch(e){setError(e instanceof Error?e.message:"Imeshindikana kufuta status.");}finally{setBusy(false);}}

  return <section className="campus-stories">
    <div className="campus-stories-heading"><div><span className="social-kicker">CAMPUS STORIES</span><h3>Status za saa 24</h3></div><span><Clock3 size={13}/> Huisha baada ya saa 24</span></div>
    <div className="campus-stories-rail">
      <button type="button" className="campus-story-tile create" onClick={()=>ownGroup?setViewing(ownGroup.stories[0]):setOpen(true)}>
        <span className="campus-story-ring own"><span className="campus-story-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:initials}</span><i><Plus size={15}/></i></span>
        <b>My Story</b><small>{ownGroup?ownGroup.stories.length+" status · Ongeza":"Ongeza status"}</small>
      </button>
      {groups.filter(g=>g.authorId!==user.id).map(group=>{const latest=group.stories[group.stories.length-1];return <button type="button" className="campus-story-tile" key={group.authorId} onClick={()=>setViewing(group.stories[0])}><span className="campus-story-ring"><span className="campus-story-avatar">{latest.mediaUrl&&latest.mediaType==="image"?<img src={latest.mediaUrl} alt=""/>:group.authorAvatar?<img src={group.authorAvatar} alt=""/>:group.authorName.slice(0,1).toUpperCase()}</span></span><b>{group.authorName.split(" ")[0]}</b><small>{group.stories.length>1?group.stories.length+" status":"Story mpya"}</small></button>;})}
      {groups.length===0&&<div className="campus-stories-empty">Hakuna status mpya. Kuwa wa kwanza kushare.</div>}
    </div>
    {open&&<div className="campus-story-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}><form className="campus-story-compose" onSubmit={publish}><header><div><span className="social-kicker">SHARE A MOMENT</span><h3>Weka status yako</h3></div><button type="button" onClick={()=>setOpen(false)} aria-label="Close"><X/></button></header><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={500} placeholder="Unaendeleaje leo? Share na campus…"/>{preview&&<div className="campus-story-preview">{file?.type.startsWith("video/")?<video src={preview} controls/>:<img src={preview} alt="Story preview"/>}</div>}<div className="campus-story-actions"><button type="button" onClick={()=>{if(inputRef.current){inputRef.current.accept="image/*";inputRef.current.click();}}}><ImagePlus size={17}/> Picha</button><button type="button" onClick={()=>{if(inputRef.current){inputRef.current.accept="video/*";inputRef.current.click();}}}><Video size={17}/> Video</button><input ref={inputRef} type="file" hidden onChange={e=>choose(e.target.files?.[0]||null)}/><small>{content.length}/500 · Picha 12 MB · Video 100 MB</small></div>{error&&<p className="social-error">{error}</p>}<button className="campus-story-publish" disabled={busy||(!content.trim()&&!file)}>{busy?<><LoaderCircle size={16}/> Inachapisha…</>:<><Send size={16}/> Chapisha status</>}</button></form></div>}
    {viewing&&<div className="campus-story-viewer" onClick={()=>setViewing(null)}><button className="campus-story-viewer-close" aria-label="Close"><X/></button><div className="campus-story-viewer-card" onClick={e=>e.stopPropagation()}><div className="campus-story-progress"><i/></div><div className="campus-story-viewer-author"><span className="campus-story-avatar">{viewing.authorAvatar?<img src={viewing.authorAvatar} alt=""/>:viewing.authorName.slice(0,1)}</span><b>{viewing.authorName}</b><small>{viewingIndex+1}/{viewingGroup?.stories.length||1}</small></div>{viewing.mediaUrl&&viewing.mediaType==="video"?<video src={viewing.mediaUrl} controls autoPlay playsInline/>:viewing.mediaUrl?<img src={viewing.mediaUrl} alt="Story"/>:<div className="campus-story-text">{viewing.content}</div>}{viewing.mediaUrl&&viewing.content&&<p>{viewing.content}</p>}<div className="campus-story-viewer-controls"><button type="button" disabled={!viewingGroup||viewingIndex<=0} onClick={()=>viewingGroup&&setViewing(viewingGroup.stories[viewingIndex-1])}><ChevronLeft size={18}/> Iliyopita</button><button type="button" disabled={!viewingGroup||viewingIndex>=viewingGroup.stories.length-1} onClick={()=>viewingGroup&&setViewing(viewingGroup.stories[viewingIndex+1])}>Inayofuata <ChevronRight size={18}/></button></div>{viewing.authorId===user.id&&<button type="button" className="campus-story-delete" disabled={busy} onClick={()=>void deleteStory(viewing)}><Trash2 size={16}/> Futa status hii</button>}</div></div>}
    {error&&!open&&<p className="social-error">{error}</p>}
  </section>;
}
