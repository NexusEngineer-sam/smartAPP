"use client";

import { useMemo, useState } from "react";
import { Bot, X, Send, Sparkles, CalendarDays, Bell, Wallet, ShieldCheck } from "lucide-react";

type Message = { role: "guide" | "student"; text: string; link?: string };

const suggestions = [
  { label: "My timetable", icon: CalendarDays, prompt: "How do I check my timetable?" },
  { label: "Phone alerts", icon: Bell, prompt: "How do I enable phone notifications?" },
  { label: "My expenses", icon: Wallet, prompt: "How do I track my expenses?" },
  { label: "Account safety", icon: ShieldCheck, prompt: "How do I keep my account safe?" },
];

function answerQuestion(question: string): Message {
  const q = question.toLowerCase();
  if (/timetable|class|lecture|schedule|ratiba/.test(q)) return { role: "guide", text: "Open the Upcoming classes section on your dashboard to see sessions, venues and times. If it is empty, your lecturer or campus administrator has not assigned sessions to your account yet.", link: "#planner" };
  if (/notification|alert|push|simu|phone/.test(q)) return { role: "guide", text: "Use “Enable phone alerts” in the top bar. Allow notifications when your browser asks, then keep the app installed on your phone. Phone alerts also require the campus server's push keys to be configured by the administrator.", link: "#updates" };
  if (/expense|finance|money|matumizi|gharama/.test(q)) return { role: "guide", text: "Go to My finances and choose Add transaction. Enter a description, amount in TZS and category. Your records are private to your signed-in account.", link: "#finance" };
  if (/id|identity|kitambulisho|qr/.test(q)) return { role: "guide", text: "Tap your Digital ID button below your welcome message. It shows your campus identity and verification details. Keep your sign-in credentials private." };
  if (/announcement|notice|taarifa|habari/.test(q)) return { role: "guide", text: "Official published updates appear in Campus announcements. Check this section regularly for campus notices.", link: "#updates" };
  if (/password|security|safe|usalama|account|login/.test(q)) return { role: "guide", text: "Use a unique password, sign out on shared devices, and never share your password or one-time verification links. If you cannot sign in, contact your campus administrator." };
  if (/admin|administrator|help|support|msaada/.test(q)) return { role: "guide", text: "For account changes, timetable assignments or official campus records, contact the authorised campus administrator. Admin tools are visible only to accounts with the ADMIN role.", link: "/admin" };
  if (/hello|hi|habari|mambo|sasa/.test(q)) return { role: "guide", text: "Hello! I'm SAM Campus Guide. I can help you navigate your timetable, campus updates, Digital ID, expenses and phone alerts. What would you like to know?" };
  return { role: "guide", text: "I’m the campus navigation guide preview, not a live university records or AI service yet. Try asking about your timetable, phone alerts, expenses, Digital ID, announcements or account security." };
}

export default function CampusGuide() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "guide", text: "Karibu! I’m SAM AI Campus Assistant. Ask me about campus life, study skills or how to use this dashboard." }]);
  const [isThinking, setIsThinking] = useState(false);
  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  async function send(value = draft) {
    const question = value.trim();
    if (!question || isThinking) return;
    const history = [...messages, { role: "student" as const, text: question }];
    setMessages(history);
    setDraft("");
    setIsThinking(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-10).map((message) => ({
            role: message.role === "student" ? "user" : "assistant",
            content: message.text,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = response.status === 503
          ? "SAM AI bado haijaunganishwa na AI provider. Admin anahitaji kuweka GROQ_API_KEY kwenye Render Environment."
          : data.error || "Samahani, huduma ya AI haipatikani kwa sasa. Jaribu tena baadaye.";
        setMessages((current) => [...current, { role: "guide", text: message }]);
      } else {
        setMessages((current) => [...current, { role: "guide", text: data.reply }]);
      }
    } catch {
      setMessages((current) => [...current, { role: "guide", text: "Imeshindikana kuwasiliana na SAM AI. Hakikisha mtandao upo kisha jaribu tena." }]);
    } finally {
      setIsThinking(false);
    }
  }

  return <>
    <button className="campus-guide-launch" type="button" onClick={() => setOpen(true)} aria-label="Open SAM Campus Guide">
      <span className="campus-guide-launch-icon"><Sparkles size={18}/></span>
      <span><b>SAM Campus Guide</b><small>Quick help for campus life</small></span>
      <Bot size={19}/>
    </button>
    {open && <div className="campus-guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="campus-guide-panel" role="dialog" aria-modal="true" aria-label="SAM Campus Guide">
        <header className="campus-guide-head">
          <span className="campus-guide-avatar"><Bot size={20}/></span>
          <div><b>SAM Campus Guide</b><small><i/> AI campus assistant</small></div>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close guide"><X size={19}/></button>
        </header>
        <div className="campus-guide-messages" aria-live="polite">
          {messages.map((message, index) => <article className={`campus-guide-message ${message.role}`} key={index}>
            <p>{message.text}</p>
            {message.link && <a href={message.link} onClick={() => setOpen(false)}>Open section ↗</a>}
          </article>)}
        </div>
        {messages.length === 1 && <div className="campus-guide-suggestions">{suggestions.map(({ label, icon: Icon, prompt }) => <button type="button" key={label} onClick={() => send(prompt)}><Icon size={14}/>{label}</button>)}</div>}
        {isThinking && <article className="campus-guide-message guide"><p>SAM AI is thinking…</p></article>}
        <form className="campus-guide-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about your campus…" maxLength={400} aria-label="Ask SAM Campus Guide"/>
          <button type="submit" disabled={!canSend || isThinking} aria-label="Send question"><Send size={17}/></button>
        </form>
        <small className="campus-guide-disclaimer">AI assistant. It does not access or change official student records; verify important campus information with administration.</small>
      </section>
    </div>}
  </>;
}
