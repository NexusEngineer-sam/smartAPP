"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X, Share } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

export default function PwaInstall() {
  const [promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
  const [installed,setInstalled]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const standalone=window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & {standalone?:boolean}).standalone===true;
    setInstalled(standalone);
    const onPrompt=(event:Event)=>{event.preventDefault();setPromptEvent(event as InstallPromptEvent);};
    const onInstalled=()=>{setInstalled(true);setPromptEvent(null);setHelpOpen(false);};
    window.addEventListener("beforeinstallprompt",onPrompt);
    window.addEventListener("appinstalled",onInstalled);
    if("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(()=>{});
    return ()=>{window.removeEventListener("beforeinstallprompt",onPrompt);window.removeEventListener("appinstalled",onInstalled);};
  },[]);

  async function install(){
    if(!promptEvent){setHelpOpen(true);return;}
    setBusy(true);
    try{await promptEvent.prompt();const choice=await promptEvent.userChoice;if(choice.outcome==="accepted")setPromptEvent(null);else setHelpOpen(true);}
    catch{setHelpOpen(true);}
    finally{setBusy(false);}
  }

  if(installed)return <span className="pwa-installed-label"><Smartphone size={15}/> App installed</span>;
  return <>
    <button type="button" className="pwa-install-trigger" onClick={install} disabled={busy} title="Install NEXUS"><Download size={16}/><span>{busy?"Opening…":"Install app"}</span></button>
    {helpOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setHelpOpen(false);}}>
      <section className="modal-card pwa-install-help" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
        <div className="modal-heading"><div><span className="eyebrow">NEXUS ON YOUR PHONE</span><h2 id="pwa-install-title">Install NEXUS</h2></div><button type="button" className="icon-btn" onClick={()=>setHelpOpen(false)} aria-label="Close"><X size={19}/></button></div>
        <p className="pwa-install-intro">To add NEXUS to your home screen:</p>
        <ol><li><b>Android / Chrome:</b> tap the three dots ⋮ in Chrome, then choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li><b>iPhone / Safari:</b> tap <Share size={14}/> Share, then <b>Add to Home Screen</b>.</li><li>If opened inside WhatsApp or Facebook, choose <b>Open in browser</b> first.</li></ol>
        <button type="button" className="primary-btn" onClick={()=>setHelpOpen(false)}>Got it</button>
      </section>
    </div>}
  </>;
}
