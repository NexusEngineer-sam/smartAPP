"use client";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, RefreshCw, Sparkles, Users } from "lucide-react";

type SocialPost={id:string;content:string;createdAt:string;authorId?:string;authorName:string;authorAvatar?:string|null;likes:number;comments:number;likedByMe:boolean};
type Comment={id:string;body:string;createdAt:string;authorName:string};
export default function SocialFeed({user}:{user:{name:string;email:string;role:string;avatarUrl?:string|null}}){
 const [posts,setPosts]=useState<SocialPost[]>([]);
 const [content,setContent]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [commentPost,setCommentPost]=useState<string|null>(null);
 const [comments,setComments]=useState<Record<string,Comment[]>>({});
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 async function load(){try{const r=await fetch("/api/social",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not load the community feed.");setPosts(d.posts||[]);}catch(e){setError(e instanceof Error?e.message:"Feed unavailable.");}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function publish(e:React.FormEvent){e.preventDefault();if(!content.trim())return;setBusy(true);setError("");try{const r=await fetch("/api/social",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Post could not be published.");setPosts(p=>[d.post,...p]);setContent("");}catch(e){setError(e instanceof Error?e.message:"Post failed.");}finally{setBusy(false);}}
 async function like(post:SocialPost){setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:!x.likedByMe,likes:x.likes+(x.likedByMe?-1:1)}:x));try{const r=await fetch("/api/social",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:post.id})});if(!r.ok)throw new Error();const d=await r.json();setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:d.liked,likes:d.likes}:x));}catch{setPosts(p=>p.map(x=>x.id===post.id?{...x,likedByMe:post.likedByMe,likes:post.likes}:x));setError("Like haijahifadhiwa. Jaribu tena.");}}
 async function toggleComments(id:string){if(commentPost===id){setCommentPost(null);return;}setCommentPost(id);if(comments[id])return;try{const r=await fetch("/api/social/comments?postId="+encodeURIComponent(id));const d=await r.json();if(r.ok)setComments(c=>({...c,[id]:d.comments||[]}));}catch{}}
 async function sendComment(id:string){const body=(drafts[id]||"").trim();if(!body)return;try{const r=await fetch("/api/social/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({postId:id,body})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Comment failed.");setComments(c=>({...c,[id]:[...(c[id]||[]),d.comment]}));setPosts(p=>p.map(x=>x.id===id?{...x,comments:x.comments+1}:x));setDrafts(v=>({...v,[id]:""}));}catch(e){setError(e instanceof Error?e.message:"Comment failed.");}}
 const initials=user.name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 return <section className="social-feed">
  <div className="social-hero"><div><span className="social-kicker"><Sparkles size={14}/> STUDENT COMMUNITY</span><h2>Your campus. Your people.</h2><p>Share ideas, celebrate moments and connect with students around the world.</p></div><span className="social-hero-icon"><Users size={26}/></span></div>
  <form className="social-composer" onSubmit={publish}>
   <div className="social-compose-top"><span className="social-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:initials}</span><div><b>Create a campus post</b><small>Posting as {user.name}</small></div></div>
   <textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={1200} placeholder="What's happening in your student life?" aria-label="Write a post"/>
   <div className="social-compose-bottom"><small>{content.length}/1200 · Be respectful. Keep the community safe.</small><button disabled={busy||!content.trim()}><Send size={15}/>{busy?"Publishing…":"Publish post"}</button></div>
  </form>
  {error&&<p className="social-error" role="alert">{error}</p>}
  <div className="social-feed-heading"><div><span className="social-kicker">GLOBAL STUDENT FEED</span><h3>Latest from students</h3></div><button type="button" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
  {loading?<div className="social-empty"><RefreshCw/><span>Loading student posts…</span></div>:posts.length===0?<div className="social-empty"><Users size={28}/><b>Your community starts here</b><span>Share the first post and invite other students to join.</span></div>:posts.map(post=><article className="social-post" key={post.id}>
   <div className="social-post-author"><span className="social-avatar">{post.authorAvatar?<img src={post.authorAvatar} alt=""/>:post.authorName.slice(0,1).toUpperCase()}</span><div><b>{post.authorName}</b><small>Student community · {new Date(post.createdAt).toLocaleString()}</small></div><span className="social-post-tag">STUDENT</span></div>
   <p className="social-post-content">{post.content}</p>
   <div className="social-post-stats"><span>{post.likes} likes</span><span>{post.comments} comments</span></div>
   <div className="social-post-actions"><button type="button" className={post.likedByMe?"liked":""} onClick={()=>void like(post)}><Heart size={17} fill={post.likedByMe?"currentColor":"none"}/> Like</button><button type="button" onClick={()=>void toggleComments(post.id)}><MessageCircle size={17}/> Comment</button></div>
   {commentPost===post.id&&<div className="social-comments">{(comments[post.id]||[]).map(c=><div className="social-comment" key={c.id}><b>{c.authorName}</b><span>{c.body}</span></div>)}<form onSubmit={e=>{e.preventDefault();void sendComment(post.id);}}><input value={drafts[post.id]||""} onChange={e=>setDrafts(v=>({...v,[post.id]:e.target.value}))} maxLength={800} placeholder="Write a thoughtful comment…"/><button disabled={!(drafts[post.id]||"").trim()}><Send size={15}/></button></form></div>}
  </article>)}
 </section>;
}
