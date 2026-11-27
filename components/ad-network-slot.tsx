"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { adsbygoogle?: unknown[] } }

export default function AdNetworkSlot(){
 const slotRef=useRef<HTMLDivElement|null>(null);
 const client=process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
 const slot=process.env.NEXT_PUBLIC_ADSENSE_SLOT;
 useEffect(()=>{
  if(!client||!slot||!slotRef.current)return;
  const scriptId="samwel-adsense-script";
  if(!document.getElementById(scriptId)){
   const script=document.createElement("script");script.id=scriptId;script.async=true;
   script.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(client);
   script.crossOrigin="anonymous";document.head.appendChild(script);
  }
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{}
 },[client,slot]);
 if(!client||!slot)return <div className="empty-state compact" style={{margin:"12px 0"}}><span>Ad network slot is ready for configuration. Google AdSense will appear after publisher approval and valid ad-unit IDs are added to Render.</span></div>;
 return <div ref={slotRef} style={{minHeight:100,overflow:"hidden",margin:"14px 0"}}><ins className="adsbygoogle" style={{display:"block",minHeight:90}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></div>;
}
