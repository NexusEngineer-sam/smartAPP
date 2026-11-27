"use client";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Send, RefreshCw, Sparkles, Users, ImagePlus, Video, Smile, X } from "lucide-react";

type SocialPost={id:string;content:string;createdAt:string;authorId?:string;authorName:string;authorAvatar?:string|null;likes:number;comments:number;likedByMe:boolean;mediaUrl?:string|null;mediaType?:"image"|"video"|null};
type Comment={id:string;body:string;createdAt:string;authorName:string};
type Burst={id:number;left:number};

export default function SocialFeed({user}:{user:{name:string;email:string;role:string;avatarUrl?:string|null}}){
 const [posts,setPosts]=useState<SocialPost[]>([]);
 const [content,setContent]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [commentPost,setCommentPost]=useState<string|null>(null);
 const [comments,setComments]=useState<Record<string,Comment[]>>({});
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [composerOpen,setComposerOpen]=useState(false);
 const [pendingLikes,setPendingLikes]=useState<string[]>([]);
 const [bursts,setBursts]=useState<Record<string,Burst[]>>({});
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState("");
 const fileRef=useRef<HTMLInputElement>(null);
 const burstId=useRef(0);
 const initials=user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

 async function load(){try{const r=await fetch("/api/social",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load the community feed.");setPosts(d.posts||[]);}catch(e){setError(e instanceof Error?e.message:"Feed unavailable.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function selectFile(next:File|null){setError("");if(preview)URL.revokeObjectURL(preview);setPreview("");setFile(null);if(!next)return;const isImage=next.type.startsWith("image/");const isVideo=next.type.startsWith("video/");if(!isImage&&!isVideo){setError("Chagua picha au video pekee.");return;}const limit=isVideo?100:12;if(next.size>limit*1024*1024){setError("Faili imezidi "+limit+" MB.");return;}setFile(next);setPreview(URL.createObjectURL(next));}
 function heartBurst(id:string){const item={id:++burstId.current,left:38+Math.round(Math.random()*24)};setBursts(v=>({...v,[id]:[...(v[id]||[]),item].slice(-4)}));window.setTimeout(()=>setBursts(v=>({...v,[id]:(v[id]||[]).filter(x=>x.id!==item.id)})),1050);}
 async function publish(e:React.FormEvent){e.preventDefault();if((!content.trim()&&!file)||busy)return;setBusy(true);setError("");try{let mediaUrl:string|null=null;let mediaType:"image"|"video"|null=null;if(file){const sigResponse=await fetch("/api/social/media-signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceType:file.type.startsWith("video/")?"video":"image"})});const sig=await sigResponse.json();if(!sigResponse.ok)throw new Error(sig.error||"Media storage is not configured.");const form=new FormData();form.append("file",file);form.append("api_key",sig.apiKey);form.append("timestamp",String(sig.timestamp));form.append("folder",sig.folder);form.append("signature",sig.signature);const cloudResponse=await fetch("https://api.cloudinary.com/v1_1/"+sig.cloudName+"/"+sig.resourceType+"/upload",{method:"POST",body:form});const cloud=await cloudResponse.json();if(!cloudResponse.ok)throw new Error(cloud.error?.message||"Upload failed.");mediaUrl=cloud.secure_url;mediaType=sig.resourceType;}const r=await fetch("/api/social",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,mediaUrl,mediaType})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Post could not be published.");setPosts(p=>[d.post,...p]);setContent("");setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview("");if(fileRef.current)fileRef.current.value="";setComposerOpen(false);}catch(e){setError(e instanceof Error?e.message:"Post failed.");}finally{setBusy(false);}}
 async function like(post:SocialPost,withBurst=true){if(pendingLikes.includes(post.id))return;if(withBurst)heartBurst(post.id);setPendingLikes(v=>[...v,post.id]);setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:!post.likedByMe,likes:Math.max(0,x.likes+(post.likedByMe?-1:1))}:x));try{const r=await fetch("/api/social",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:post.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Like failed.");setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:d.liked,likes:d.likes}:x));}catch{setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:post.likedByMe,likes:post.likes}:x));setError("Like haijahifadhiwa. Jaribu tena.");}finally{setPendingLikes(v=>v.filter(x=>x!==post.id));}}
 function doubleTap(post:SocialPost){heartBurst(post.id);if(!post.likedByMe&&!pendingLikes.includes(post.id))void like(post,false);}
 async function toggleComments(id:string){if(commentPost===id){setCommentPost(null);return;}setCommentPost(id);if(comments[id])return;try{const r=await fetch("/api/social/comments?postId="+encodeURIComponent(id));const d=await r.json();if(r.ok)setComments(c=>({...c,[id]:d.comments||[]}));}catch{}}
 async function sendComment(id:string){const body=(drafts[id]||"").trim();if(!body)return;try{const r=await fetch("/api/social/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:id,body})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Comment failed.");setComments(c=>({...c,[id]:[...(c[id]||[]),d.comment]}));setPosts(p=>p.map(x=>x.id===id?{...x,comments:x.comments+1}:x));setDrafts(v=>({...v,[id]:""}));}catch(e){setError(e instanceof Error?e.message:"Comment failed.");}}
 return <section className="social-feed">
  <div className="social-hero"><div><span className="social-kicker"><Sparkles size={14}/> STUDENT COMMUNITY</span><h2>Your campus. Your people.</h2><p>Share ideas, celebrate moments and connect with students around the world.</p></div><span className="social-hero-icon"><Users size={26}/></span></div>
  <section className={`social-composer social-composer-compact ${composerOpen?"is-open":""}`}>
   <div className="social-compose-top"><span className="social-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:initials}</span><button type="button" className="social-whats-on-mind" onClick={()=>setComposerOpen(true)}>What's on your mind, {user.name.split(" ")[0]}?</button></div>
   {composerOpen&&<form onSubmit={publish} className="social-compose-expanded">
    <textarea autoFocus value={content} onChange={e=>setContent(e.target.value)} maxLength={1200} placeholder="Share something with your campus community…" aria-label="Write a post"/>
    {preview&&<div className="social-media-preview">{file?.type.startsWith("video/")?<video src={preview} controls playsInline/>:<img src={preview} alt="Selected upload preview"/>}<span>{file?.name}</span></div>}\n    <div className="social-compose-tools"><span><button type="button" onClick={()=>{if(fileRef.current){fileRef.current.accept="image/*";fileRef.current.click();}}}><ImagePlus size={16}/> Photo</button><button type="button" onClick={()=>{if(fileRef.current){fileRef.current.accept="video/*";fileRef.current.click();}}}><Video size={16}/> Video</button><button type="button" onClick={()=>setContent(v=>v+" 😊")}><Smile size={16}/> Feeling</button><input ref={fileRef} className="social-file-input" type="file" accept="image/*,video/*" onChange={e=>selectFile(e.target.files?.[0]||null)}/></span><button type="button" className="social-compose-close" aria-label="Close composer" onClick={()=>{setComposerOpen(false);setContent("");selectFile(null);}}><X size={16}/></button></div>
    <div className="social-compose-bottom"><small>{content.length}/1200 · Photos 12 MB · Videos 100 MB. Be respectful.</small><button disabled={busy||(!content.trim()&&!file)}><Send size={15}/>{busy?"Publishing…":"Publish post"}</button></div>
   </form>}
   {!composerOpen&&<div className="social-compose-shortcuts"><button type="button" onClick={()=>{setComposerOpen(true);window.setTimeout(()=>{if(fileRef.current){fileRef.current.accept="image/*";fileRef.current.click();}},180);}}><ImagePlus size={16}/> Photo</button><button type="button" onClick={()=>{setComposerOpen(true);window.setTimeout(()=>{if(fileRef.current){fileRef.current.accept="video/*";fileRef.current.click();}},180);}}><Video size={16}/> Video</button><button type="button" onClick={()=>setComposerOpen(true)}><Smile size={16}/> Feeling</button></div>}
  </section>
  {error&&<p className="social-error" role="alert">{error}</p>}
  <div className="social-feed-heading"><div><span className="social-kicker">GLOBAL STUDENT FEED</span><h3>Latest from students</h3></div><button type="button" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
  {loading?<div className="social-empty"><RefreshCw/><span>Loading student posts…</span></div>:posts.length===0?<div className="social-empty"><Users size={28}/><b>Your community starts here</b><span>Share the first post and invite other students to join.</span></div>:posts.map(post=><article className="social-post" key={post.id}>
   <div className="social-post-author"><span className="social-avatar">{post.authorAvatar?<img src={post.authorAvatar} alt=""/>:post.authorName.slice(0,1).toUpperCase()}</span><div><b>{post.authorName}</b><small>Student community · {new Date(post.createdAt).toLocaleString()}</small></div><span className="social-post-tag">STUDENT</span></div>
   <div className="social-post-content-wrap" onDoubleClick={()=>doubleTap(post)}>{post.content&&<p className="social-post-content">{post.content}</p>}{post.mediaUrl&&<div className="social-post-media">{post.mediaType==="video"?<video src={post.mediaUrl} controls playsInline preload="metadata"/>:<img src={post.mediaUrl} alt="Post attachment"/>}</div> }{(bursts[post.id]||[]).map(b=><span key={b.id} className="social-heart-burst" style={{left:`${b.left}%`}}>♥</span>)}</div>
   <div className="social-post-stats"><span>{post.likes} likes</span><span>{post.comments} comments</span></div>
   <div className="social-post-actions"><button type="button" className={post.likedByMe?"liked":""} disabled={pendingLikes.includes(post.id)} onClick={()=>void like(post)}><Heart size={17} fill={post.likedByMe?"currentColor":"none"}/>{post.likedByMe?"Liked":"Like"}</button><button type="button" onClick={()=>void toggleComments(post.id)}><MessageCircle size={17}/> Comment</button><small className="social-doubletap-hint">Double-tap post to send love</small></div>
   {commentPost===post.id&&<div className="social-comments">{(comments[post.id]||[]).map(c=><div className="social-comment" key={c.id}><b>{c.authorName}</b><span>{c.body}</span></div>)}<form onSubmit={e=>{e.preventDefault();void sendComment(post.id);}}><input value={drafts[post.id]||""} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} maxLength={800} placeholder="Write a thoughtful comment…"/><button disabled={!(drafts[post.id]||"").trim()}><Send size={15}/></button></form></div>}
  </article>)}
 </section>;
}
