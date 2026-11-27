"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowRight, School, BookOpen, Layers3 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [university,setUniversity] = useState("");
  const [faculty,setFaculty] = useState("");
  const [course,setCourse] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/student-profile", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({university,faculty,course})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Imeshindikana kuhifadhi taarifa.");
      router.replace("/"); router.refresh();
    } catch(err) { setError(err instanceof Error ? err.message : "Jaribu tena."); }
    finally { setBusy(false); }
  }

  return <main className="onboarding-shell">
    <section className="onboarding-card">
      <div className="onboarding-logo"><GraduationCap size={24}/><b>SAMWEL CAMPUS OS</b></div>
      <div className="onboarding-progress"><span/></div>
      <span className="onboarding-kicker">HATUA YA PILI · STUDENT PROFILE</span>
      <h1>Karibu kwenye jamii ya chuo.</h1>
      <p className="onboarding-intro">Tuambie unasoma wapi ili tukuunganishe na taarifa, watu na matukio ya campus yako.</p>
      <form onSubmit={submit} className="onboarding-form">
        <label><span><School size={15}/> Chuo kikuu / College</span><input required minLength={2} maxLength={140} value={university} onChange={e=>setUniversity(e.target.value)} placeholder="Mfano: University of Dodoma"/></label>
        <label><span><Layers3 size={15}/> Faculty / College / School</span><input required minLength={2} maxLength={140} value={faculty} onChange={e=>setFaculty(e.target.value)} placeholder="Mfano: College of Informatics and Virtual Education"/></label>
        <label><span><BookOpen size={15}/> Kozi yako</span><input required minLength={2} maxLength={140} value={course} onChange={e=>setCourse(e.target.value)} placeholder="Mfano: Bachelor of Software Engineering"/></label>
        {error && <p className="onboarding-error" role="alert">{error}</p>}
        <button disabled={busy}>{busy ? "Inahifadhi..." : "Endelea kwenye Campus OS"} <ArrowRight size={17}/></button>
      </form>
      <small className="onboarding-note">Huhitaji Registration Number. Taarifa hizi zitasaidia kubinafsisha uzoefu wako wa Campus OS.</small>
    </section>
  </main>;
}
