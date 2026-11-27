"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

export default function LaunchSplash() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("campus-os-launched")) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("campus-os-launched", "1");
    }, 1350);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return <div className="campus-launch-splash" aria-label="SAMWEL CAMPUS OS loading">
    <div className="launch-brand-mark"><GraduationCap size={31}/></div>
    <div className="launch-brand-name">SAMWEL <b>CAMPUS OS</b></div>
    <p>Your campus. Your community. Your future.</p>
    <div className="launch-dots"><i/><i/><i/></div>
  </div>;
}
