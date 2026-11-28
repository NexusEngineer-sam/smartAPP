"use client";
import { useEffect } from "react";

export default function EngagementTracker(){
 useEffect(()=>{
  let key:string|null=null, timer:number|undefined, active=false;
  const send=async(action:"start"|"ping"|"end")=>{
   if(!key)return;
   try{await fetch("/api/engagement",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,sessionKey:key,pagePath:window.location.pathname}),keepalive:action==="end"});}catch{}
  };
  const begin=()=>{if(active||document.visibilityState!=="visible")return;active=true;key=window.crypto.randomUUID();void send("start");timer=window.setInterval(()=>{if(document.visibilityState==="visible")void send("ping");},60000);};
  const finish=()=>{if(!active)return;active=false;if(timer)window.clearInterval(timer);void send("end");key=null;};
  const visibility=()=>{if(document.visibilityState==="visible")begin();else finish();};
  begin();document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",finish);
  return()=>{finish();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",finish);};
 },[]);
 return null;
}
