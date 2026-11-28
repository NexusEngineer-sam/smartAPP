"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Users, Newspaper, CalendarDays, Video, Globe2, LoaderCircle } from "lucide-react";

type Result = { id:string; type:"student"|"news"|"event"|"video"|"community"; title:string; subtitle:string };
const icons = { student:Users, news:Newspaper, event:CalendarDays, video:Video, community:Globe2 };
const destinations:Record<Result["type"],string> = { student:"global", news:"discover", event:"events", video:"videos", community:"global" };

export default function CampusGlobalSearch({ onNavigate }:{onNavigate:(section:string)=>void}) {
  const [query,setQuery]=useState("");
  const [results,setResults]=useState<Result[]>([]);
  const [open,setOpen]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const root=useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(query.trim().length<2){setResults([]);setError("");setLoading(false);return;}
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError("");
      try{
        const response=await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`,{cache:"no-store",signal:controller.signal});
        if(!response.ok)throw new Error("Search is temporarily unavailable.");
        const data=await response.json();setResults(data.results||[]);
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Search failed.");}
      finally{if(!controller.signal.aborted)setLoading(false);}
    },260);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[query]);

  useEffect(()=>{
    const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};
    document.addEventListener("mousedown",close);return ()=>document.removeEventListener("mousedown",close);
  },[]);

  return <div className="campus-global-search" ref={root}>
    <div className="campus-search-field"><Search size={18}/><input aria-label="Search campus" placeholder="Search students, news, events…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);}}/><kbd>⌘ K</kbd>{query&&<button type="button" aria-label="Clear search" onClick={()=>{setQuery("");setResults([]);}}><X size={16}/></button>}</div>
    {open&&query.trim().length>=2&&<div className="campus-search-results" role="listbox" aria-label="Search results">
      <div className="campus-search-caption">{loading?<><LoaderCircle size={13} className="search-spin"/> Searching campus…</>:error||`${results.length} results found`}</div>
      {results.map(result=>{const Icon=icons[result.type];return <button type="button" className="campus-search-result" key={result.type+result.id} onClick={()=>{setOpen(false);setQuery("");onNavigate(destinations[result.type]);}}><span className="campus-search-result-icon"><Icon size={17}/></span><span><b>{result.title}</b><small>{result.subtitle}</small></span><span className="campus-search-type">{result.type}</span></button>;})}
      {!loading&&!error&&results.length===0&&<div className="campus-search-empty">No matches yet. Try another keyword.</div>}
    </div>}
  </div>;
}
