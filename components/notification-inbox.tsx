"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, RefreshCw, X } from "lucide-react";

type CampusNotification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
};

const READ_KEY = "campus-os-read-notifications";

export default function NotificationInbox() {
  const [items, setItems] = useState<CampusNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Notifications could not be loaded.");
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_KEY) || "[]");
      if (Array.isArray(saved)) setReadIds(saved.filter((x): x is string => typeof x === "string"));
    } catch {}
    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(refreshWhenVisible, 15000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const unread = useMemo(() => items.filter(item => !readIds.includes(item.id)).length, [items, readIds]);

  function markRead(id: string) {
    setReadIds(current => {
      const next = current.includes(id) ? current : [...current, id];
      try { localStorage.setItem(READ_KEY, JSON.stringify(next.slice(-500))); } catch {}
      return next;
    });
  }

  function markAllRead() {
    const next = Array.from(new Set([...readIds, ...items.map(item => item.id)])).slice(-500);
    setReadIds(next);
    try { localStorage.setItem(READ_KEY, JSON.stringify(next)); } catch {}
  }

  return <div className="notification-inbox-wrap">
    <button type="button" className="notification-inbox-trigger" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) void load(); }}>
      <Bell size={18} />
      {unread > 0 && <span className="notification-inbox-badge">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <section className="notification-inbox-panel" aria-label="Notification inbox">
      <header className="notification-inbox-header">
        <div><b>Notification inbox</b><small>{unread} unread · {items.length} recent</small></div>
        <div className="notification-inbox-actions">
          <button type="button" title="Refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/></button>
          <button type="button" title="Mark all read" onClick={markAllRead}><CheckCheck size={16}/></button>
          <button type="button" title="Close inbox" onClick={() => setOpen(false)}><X size={16}/></button>
        </div>
      </header>
      {error && <p className="notification-inbox-error">{error}</p>}
      <div className="notification-inbox-list">
        {loading && items.length === 0 ? <p className="notification-inbox-empty">Loading your notifications…</p> :
          items.length === 0 ? <p className="notification-inbox-empty">You're all caught up. New class and campus updates will appear here.</p> :
          items.map(item => {
            const isRead = readIds.includes(item.id);
            return <button type="button" key={item.id} className={`notification-inbox-item ${isRead ? "is-read" : "is-unread"}`} onClick={() => markRead(item.id)}>
              <span className="notification-inbox-dot" />
              <span className="notification-inbox-copy"><b>{item.title}</b><span>{item.body}</span><small>{item.channel.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString()}</small></span>
            </button>;
          })}
      </div>
      <footer className="notification-inbox-footer">Tap a notification to mark it as read.</footer>
    </section>}
    <style jsx>{`
      .notification-inbox-wrap{position:relative;display:inline-flex}
      .notification-inbox-trigger{position:relative;width:40px;height:40px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:13px;background:var(--surface,rgba(255,255,255,.04));color:inherit;display:grid;place-items:center;cursor:pointer}
      .notification-inbox-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:99px;background:#e34d68;color:white;font:700 10px/18px system-ui;text-align:center;border:2px solid var(--background,#10121a)}
      .notification-inbox-panel{position:fixed;left:50%;right:auto;top:76px;transform:translateX(-50%);width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 96px);z-index:120;background:var(--card,#151824);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;color:var(--foreground,inherit)}
      .notification-inbox-header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border,rgba(255,255,255,.1))}
      .notification-inbox-header b{display:block;font-size:14px}.notification-inbox-header small{display:block;margin-top:4px;opacity:.65;font-size:11px}
      .notification-inbox-actions{display:flex;gap:5px}.notification-inbox-actions button{display:grid;place-items:center;width:29px;height:29px;border:0;border-radius:8px;background:rgba(255,255,255,.06);color:inherit;cursor:pointer}
      .notification-inbox-list{max-height:min(420px,calc(100dvh - 210px));overflow:auto}
      .notification-inbox-item{width:100%;display:flex;gap:10px;text-align:left;padding:13px 15px;border:0;border-bottom:1px solid var(--border,rgba(255,255,255,.07));background:transparent;color:inherit;cursor:pointer}
      .notification-inbox-item:hover{background:rgba(255,255,255,.04)}.notification-inbox-item.is-unread{background:rgba(100,120,255,.07)}
      .notification-inbox-dot{width:7px;height:7px;flex:0 0 7px;margin-top:5px;border-radius:50%;background:#8a75ff}.is-read .notification-inbox-dot{background:transparent;border:1px solid rgba(255,255,255,.25)}
      .notification-inbox-copy{min-width:0;display:grid;gap:5px}.notification-inbox-copy b{font-size:12px}.notification-inbox-copy span{font-size:12px;line-height:1.45;opacity:.8;overflow-wrap:anywhere}.notification-inbox-copy small{font-size:10px;opacity:.55;text-transform:capitalize}
      .notification-inbox-empty{padding:24px 18px;text-align:center;font-size:12px;line-height:1.5;opacity:.65}
      .notification-inbox-footer{padding:10px 15px;font-size:10px;opacity:.55;border-top:1px solid var(--border,rgba(255,255,255,.08))}
      .notification-inbox-error{margin:10px 14px;color:#f87171;font-size:12px}
    `}</style>
  </div>;
}
