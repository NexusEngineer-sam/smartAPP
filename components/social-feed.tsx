"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import CampusStories from "@/components/campus-stories";
import { Heart, MessageCircle, Send, RefreshCw, Sparkles, Users, ImagePlus, Video, Smile, X, Share2, Bookmark } from "lucide-react";

type SocialPost={id:string;content:string;createdAt:string;authorId?:string;authorName:string;authorAvatar?:string|null;likes:number;comments:number;likedByMe:boolean;mediaUrl?:string|null;mediaType?:"image"|"video"|null;savedByMe?:boolean};
type Comment={id:string;body:string;createdAt:string;authorName:string};
type Burst={id:number;left:number};

export default function SocialFeed({user}:{user:{id?:string;name:string;email:string;role:string;avatarUrl?:string|null}}){
 const [posts,setPosts]=useState<SocialPost[]>([]);
 const [feedMode,setFeedMode]=useState<"for-you"|"latest"|"trending"|"saved">("for-you");
 const [interestSignals,setInterestSignals]=useState<string[]>([]);
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
 useEffect(()=>{try{const saved=window.localStorage.getItem("campus-feed-interest-signals");if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed))setInterestSignals(parsed.filter((x):x is string=>typeof x==="string").slice(0,80));}}catch{}},[]);
 function learnFromPost(post:SocialPost){const words=(post.content.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]).filter(x=>!["this","that","with","from","your","about","kwa","hiyo","yako","sana","kama","hapa","nime","wana","mimi"].includes(x));setInterestSignals(previous=>{const next=[...new Set([...words,...previous])].slice(0,80);try{window.localStorage.setItem("campus-feed-interest-signals",JSON.stringify(next));}catch{}return next;});}
 const rankedPosts=useMemo(()=>{
  const now=Date.now();
  const score=(post:SocialPost)=>{
   const ageHours=Math.max(0,(now-new Date(post.createdAt).getTime())/3600000);
   const engagement=Math.log1p(Math.max(0,post.likes)*2+Math.max(0,post.comments)*3);
   const freshness=Math.exp(-ageHours/30);
   const words=(post.content.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]);
   const relevance=interestSignals.length?words.filter(word=>interestSignals.includes(word)).length/Math.min(8,interestSignals.length):0;
   return engagement*0.42+freshness*2.1+relevance*2.8;
  };
  return [...posts].filter(post=>feedMode!=="saved"||post.savedByMe).sort((a,b)=>{
   if(feedMode==="latest")return new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
   if(feedMode==="trending")return score(b)-score(a);
   const byRelevance=score(b)-score(a);
   return Math.abs(byRelevance)>0.08?byRelevance:new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime();
  });
 },[posts,feedMode,interestSignals]);


 async function load(){try{const r=await fetch("/api/social",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load the community feed.");setPosts(d.posts||[]);}catch(e){setError(e instanceof Error?e.message:"Feed unavailable.");}finally{setLoading(false);}}
 useEffect(()=>{
  void load();
  // Synchronize the shared student feed across signed-in app users.
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
  const onVisibility=()=>{if(document.visibilityState==="visible")void load();};
  document.addEventListener("visibilitychange",onVisibility);
  return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);};
 },[]);
 useEffect(()=>{
  if(!commentPost)return;
  let active=true;
  const refresh=async()=>{try{const r=await fetch("/api/social/comments?postId="+encodeURIComponent(commentPost),{cache:"no-store"});const d=await r.json();if(active&&r.ok)setComments(c=>({...c,[commentPost]:d.comments||[]}));}catch{}};
  void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},5000);
  return ()=>{active=false;window.clearInterval(timer);};
 },[commentPost]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function selectFile(next:File|null){setError("");if(preview)URL.revokeObjectURL(preview);setPreview("");setFile(null);if(!next)return;const isImage=next.type.startsWith("image/");const isVideo=next.type.startsWith("video/");if(!isImage&&!isVideo){setError("Chagua picha au video pekee.");return;}const limit=isVideo?100:12;if(next.size>limit*1024*1024){setError("Faili imezidi "+limit+" MB.");return;}setFile(next);setPreview(URL.createObjectURL(next));}
 function heartBurst(id:string){const item={id:++burstId.current,left:38+Math.round(Math.random()*24)};setBursts(v=>({...v,[id]:[...(v[id]||[]),item].slice(-4)}));window.setTimeout(()=>setBursts(v=>({...v,[id]:(v[id]||[]).filter(x=>x.id!==item.id)})),1050);}
 async function publish(e:React.FormEvent){e.preventDefault();if((!content.trim()&&!file)||busy)return;setBusy(true);setError("");try{let mediaUrl:string|null=null;let mediaType:"image"|"video"|null=null;if(file){const sigResponse=await fetch("/api/social/media-signature",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resourceType:file.type.startsWith("video/")?"video":"image"})});const sig=await sigResponse.json();if(!sigResponse.ok)throw new Error(sig.error||"Media storage is not configured.");const form=new FormData();form.append("file",file);form.append("api_key",sig.apiKey);form.append("timestamp",String(sig.timestamp));form.append("folder",sig.folder);form.append("signature",sig.signature);const cloudResponse=await fetch("https://api.cloudinary.com/v1_1/"+sig.cloudName+"/"+sig.resourceType+"/upload",{method:"POST",body:form});const cloud=await cloudResponse.json();if(!cloudResponse.ok)throw new Error(cloud.error?.message||"Upload failed.");mediaUrl=cloud.secure_url;mediaType=sig.resourceType;}const r=await fetch("/api/social",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content,mediaUrl,mediaType})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Post could not be published.");setPosts(p=>[d.post,...p]);setContent("");setFile(null);if(preview)URL.revokeObjectURL(preview);setPreview("");if(fileRef.current)fileRef.current.value="";setComposerOpen(false);}catch(e){setError(e instanceof Error?e.message:"Post failed.");}finally{setBusy(false);}}
 async function like(post:SocialPost,withBurst=true){if(pendingLikes.includes(post.id))return;learnFromPost(post);if(withBurst)heartBurst(post.id);setPendingLikes(v=>[...v,post.id]);setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:!post.likedByMe,likes:Math.max(0,x.likes+(post.likedByMe?-1:1))}:x));try{const r=await fetch("/api/social",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:post.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Like failed.");setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:d.liked,likes:d.likes}:x));}catch{setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:post.likedByMe,likes:post.likes}:x));setError("Like haijahifadhiwa. Jaribu tena.");}finally{setPendingLikes(v=>v.filter(x=>x!==post.id));}}
 function doubleTap(post:SocialPost){heartBurst(post.id);if(!post.likedByMe&&!pendingLikes.includes(post.id))void like(post,false);}
 async function savePost(post:SocialPost){const previous=!!post.savedByMe;setPosts(p=>p.map(x=>x.id===post.id?{...x,savedByMe:!previous}:x));try{const r=await fetch("/api/social/saves",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:post.id})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save post.");setPosts(p=>p.map(x=>x.id===post.id?{...x,savedByMe:d.saved}:x));}catch(e){setPosts(p=>p.map(x=>x.id===post.id?{...x,savedByMe:previous}:x));setError(e instanceof Error?e.message:"Save failed.");}}
 async function sharePost(post:SocialPost){const url=window.location.origin+window.location.pathname+"#post-"+post.id;try{if(navigator.share)await navigator.share({title:post.authorName+" on Campus",text:post.content,url});else{await navigator.clipboard.writeText(url);setError("Kiungo cha post kimenakiliwa.");}}catch{}}
 async function toggleComments(id:string){if(commentPost===id){setCommentPost(null);return;}setCommentPost(id);if(comments[id])return;try{const r=await fetch("/api/social/comments?postId="+encodeURIComponent(id));const d=await r.json();if(r.ok)setComments(c=>({...c,[id]:d.comments||[]}));}catch{}}
 async function sendComment(id:string){const body=(drafts[id]||"").trim();if(!body)return;const interactedPost=posts.find(post=>post.id===id);if(interactedPost)learnFromPost(interactedPost);try{const r=await fetch("/api/social/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:id,body})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Comment failed.");setComments(c=>({...c,[id]:[...(c[id]||[]),d.comment]}));setPosts(p=>p.map(x=>x.id===id?{...x,comments:x.comments+1}:x));setDrafts(v=>({...v,[id]:""}));}catch(e){setError(e instanceof Error?e.message:"Comment failed.");}}
 return <section className="social-feed">
  <CampusStories user={user}/>
  <section className={`social-composer social-composer-compact ${composerOpen?"is-open":""}`}>
   <div className="social-compose-top"><span className="social-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:initials}</span><button type="button" className="social-whats-on-mind" onClick={()=>setComposerOpen(true)}>What's on your mind, {user.name.split(" ")[0]}?</button></div>
   {composerOpen&&<form onSubmit={publish} className="social-compose-expanded">
    <textarea autoFocus value={content} onChange={e=>setContent(e.target.value)} maxLength={1200} placeholder="Share something with your campus community…" aria-label="Write a post"/>
    {preview&&<div className="social-media-preview">{file?.type.startsWith("video/")?<video src={preview} controls playsInline/>:<img src={preview} alt="Selected upload preview"/>}<span>{file?.name}</span></div>}
    <div className="social-compose-tools"><span><button type="button" onClick={()=>{if(fileRef.current){fileRef.current.accept="image/*";fileRef.current.click();}}}><ImagePlus size={16}/> Photo</button><button type="button" onClick={()=>{if(fileRef.current){fileRef.current.accept="video/*";fileRef.current.click();}}}><Video size={16}/> Video</button><button type="button" onClick={()=>setContent(v=>v+" 😊")}><Smile size={16}/> Feeling</button><input ref={fileRef} className="social-file-input" type="file" accept="image/*,video/*" onChange={e=>selectFile(e.target.files?.[0]||null)}/></span><button type="button" className="social-compose-close" aria-label="Close composer" onClick={()=>{setComposerOpen(false);setContent("");selectFile(null);}}><X size={16}/></button></div>
    <div className="social-compose-bottom"><small>{content.length}/1200 · Photos 12 MB · Videos 100 MB. Be respectful.</small><button disabled={busy||(!content.trim()&&!file)}><Send size={15}/>{busy?"Publishing…":"Publish post"}</button></div>
   </form>}
   {!composerOpen&&<div className="social-compose-shortcuts"><button type="button" onClick={()=>{setComposerOpen(true);window.setTimeout(()=>{if(fileRef.current){fileRef.current.accept="image/*";fileRef.current.click();}},180);}}><ImagePlus size={16}/> Photo</button><button type="button" onClick={()=>{setComposerOpen(true);window.setTimeout(()=>{if(fileRef.current){fileRef.current.accept="video/*";fileRef.current.click();}},180);}}><Video size={16}/> Video</button><button type="button" onClick={()=>setComposerOpen(true)}><Smile size={16}/> Feeling</button></div>}
  </section>
  {error&&<p className="social-error" role="alert">{error}</p>}
  <div className="social-feed-heading social-feed-discovery-heading"><div><span className="social-kicker">CAMPUS COMMUNITY</span><h3>Kinachoendelea</h3></div><button type="button" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
  <div className="social-feed-modes" role="tablist" aria-label="Panga posts">
   <button type="button" role="tab" aria-selected={feedMode==="for-you"} className={feedMode==="for-you"?"active":""} onClick={()=>setFeedMode("for-you")}><Sparkles size={14}/> Kwa ajili yako</button>
   <button type="button" role="tab" aria-selected={feedMode==="latest"} className={feedMode==="latest"?"active":""} onClick={()=>setFeedMode("latest")}>Mpya</button>
   <button type="button" role="tab" aria-selected={feedMode==="trending"} className={feedMode==="trending"?"active":""} onClick={()=>setFeedMode("trending")}>Zinazovuma</button><button type="button" role="tab" aria-selected={feedMode==="saved"} className={feedMode==="saved"?"active":""} onClick={()=>setFeedMode("saved")}><Bookmark size={14}/> Zilizohifadhiwa</button>
  </div>
  {loading?<div className="social-empty"><RefreshCw/><span>Loading student posts…</span></div>:posts.length===0?<div className="social-empty"><Users size={28}/><b>Your community starts here</b><span>Share the first post and invite other students to join.</span></div>:rankedPosts.map(post=><article className="social-post" id={"post-"+post.id} key={post.id}>
   <div className="social-post-author"><span className="social-avatar">{post.authorAvatar?<img src={post.authorAvatar} alt=""/>:post.authorName.slice(0,1).toUpperCase()}</span><div><b>{post.authorName}</b><small>Student community · {new Date(post.createdAt).toLocaleString()}</small></div><span className="social-post-tag">STUDENT</span></div>
   <div className="social-post-content-wrap" onDoubleClick={()=>doubleTap(post)}>{post.content&&<p className="social-post-content">{post.content}</p>}{post.mediaUrl&&<div className="social-post-media">{post.mediaType==="video"?<video src={post.mediaUrl} controls playsInline preload="metadata"/>:<img src={post.mediaUrl} alt="Post attachment"/>}</div> }{(bursts[post.id]||[]).map(b=><span key={b.id} className="social-heart-burst" style={{left:`${b.left}%`}}>♥</span>)}</div>
   <div className="social-post-stats"><span>{post.likes} likes</span><span>{post.comments} comments</span></div>
   <div className="social-post-actions"><button type="button" className={post.likedByMe?"liked":""} disabled={pendingLikes.includes(post.id)} onClick={()=>void like(post)}><Heart size={17} fill={post.likedByMe?"currentColor":"none"}/>{post.likedByMe?"Liked":"Like"}</button><button type="button" onClick={()=>void toggleComments(post.id)}><MessageCircle size={17}/> Comment</button><button type="button" onClick={()=>void sharePost(post)}><Share2 size={17}/> Share</button><button type="button" className={post.savedByMe?"saved-post-action":""} onClick={()=>void savePost(post)}><Bookmark size={17} fill={post.savedByMe?"currentColor":"none"}/>{post.savedByMe?"Saved":"Save"}</button></div>
   {commentPost===post.id&&<div className="social-comments">{(comments[post.id]||[]).map(c=><div className="social-comment" key={c.id}><b>{c.authorName}</b><span>{c.body}</span></div>)}<form onSubmit={e=>{e.preventDefault();void sendComment(post.id);}}><input value={drafts[post.id]||""} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} maxLength={800} placeholder="Write a thoughtful comment…"/><button disabled={!(drafts[post.id]||"").trim()}><Send size={15}/></button></form></div>}
  </article>)}
 </section>;
}
