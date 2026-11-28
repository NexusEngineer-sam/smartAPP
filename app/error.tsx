"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{console.error("[NEXUS boundary]",error);},[error]);
  return <main className="nexus-error-page">
    <div className="nexus-error-card">
      <span className="nexus-error-icon"><AlertTriangle size={24}/></span>
      <p className="nexus-error-kicker">NEXUS · RECOVERY</p>
      <h1>Something didn’t load correctly.</h1>
      <p>Your account and saved information have not been intentionally changed. Try loading this page again.</p>
      <button type="button" onClick={()=>reset()}><RefreshCw size={16}/> Try again</button>
      {error.digest&&<small>Reference: {error.digest}</small>}
    </div>
  </main>;
}
