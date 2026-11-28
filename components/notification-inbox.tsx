"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, RefreshCw, X, Sparkles } from "lucide-react";

type CampusNotification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  createdAt: string;
  priority?: "HIGH" | "NORMAL" | "LOW";
};

const READ_KEY = "campus-os-read-notifications";

export default function NotificationInbox() {
  const [items, setItems] = useState<CampusNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "IMPORTANT">("ALL");
  const [toast, setToast] = useState<CampusNotification | null>(null);
  const hasLoadedOnce = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (response.status === 401) return;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Notifications could not be loaded.");
      const nextItems: CampusNotification[] = Array.isArray(data.notifications) ? data.notifications : [];
      if (hasLoadedOnce.current) {
        const knownIds = new Set(itemsRef.current.map(item => item.id));
        const fresh = nextItems.find(item => !knownIds.has(item.id));
        if (fresh) {
          setToast(fresh);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 7000);
        }
      }
      hasLoadedOnce.current = true;
      setItems(nextItems);
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
    const timer = window.setInterval(refreshWhenVisible, 45000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const unread = useMemo(() => items.filter(item => !readIds.includes(item.id)).length, [items, readIds]);
  const importantUnread = useMemo(() => items.filter(item => item.priority === "HIGH" && !readIds.includes(item.id)).length, [items, readIds]);

  useEffect(() => {
    if (!("setAppBadge" in navigator) && !("clearAppBadge" in navigator)) return;
    const updateBadge = async () => {
      try {
        if (unread > 0 && "setAppBadge" in navigator) {
          await (navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void> }).setAppBadge?.(unread);
        } else if ("clearAppBadge" in navigator) {
          await (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
        }
        const registration = await navigator.serviceWorker?.getRegistration("/");
        registration?.active?.postMessage({ type: "SET_APP_BADGE", count: unread });
      } catch {}
    };
    void updateBadge();
  }, [unread]);
  const visibleItems = useMemo(() => {
    const filtered = filter === "IMPORTANT" ? items.filter(item => item.priority === "HIGH") : items;
    return [...filtered].sort((a, b) => {
      const rank = (value?: string) => value === "HIGH" ? 3 : value === "NORMAL" ? 2 : 1;
      return rank(b.priority) - rank(a.priority) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filter, items]);

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
    {toast && <button type="button" className="notification-live-toast" onClick={() => { setOpen(true); markRead(toast.id); setToast(null); void load(); }}>
      <span className="notification-live-icon"><Bell size={17}/></span>
      <span className="notification-live-copy"><b>{toast.title}</b><small>{toast.body}</small><em>Gusa kuona notification</em></span>
      <span className="notification-live-close" onClick={event => { event.stopPropagation(); setToast(null); }}>×</span>
    </button>}
    <button type="button" className="notification-inbox-trigger" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) void load(); }}>
      <Bell size={18} />
      {unread > 0 && <span className="notification-inbox-badge">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <section className="notification-inbox-panel" aria-label="Notification inbox">
      <header className="notification-inbox-header">
        <div><b>Notifications</b><small>{unread} unread · {items.length} recent</small></div>
        <div className="notification-inbox-actions">
          <button type="button" title="Refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={15}/></button>
          <button type="button" title="Mark all read" onClick={markAllRead}><CheckCheck size={16}/></button>
          <button type="button" title="Close inbox" onClick={() => setOpen(false)}><X size={16}/></button>
        </div>
      </header>
      <div className="notification-inbox-filters" role="tablist" aria-label="Notification filters">
        <button type="button" className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>All <span>{items.length}</span></button>
        <button type="button" className={filter === "IMPORTANT" ? "active" : ""} onClick={() => setFilter("IMPORTANT")}><Sparkles size={13}/> Important <span>{importantUnread}</span></button>
      </div>
      {error && <p className="notification-inbox-error">{error}</p>}
      <div className="notification-inbox-list">
        {loading && items.length === 0 ? <p className="notification-inbox-empty">Loading your notifications…</p> :
          visibleItems.length === 0 ? <p className="notification-inbox-empty">{filter === "IMPORTANT" ? "No high-priority updates right now." : "You're all caught up. New class and campus updates will appear here."}</p> :
          visibleItems.map(item => {
            const isRead = readIds.includes(item.id);
            const priority = item.priority || "LOW";
            return <button type="button" key={item.id} className={`notification-inbox-item ${isRead ? "is-read" : "is-unread"} priority-${priority.toLowerCase()}`} onClick={() => markRead(item.id)}>
              <span className="notification-inbox-dot" />
              <span className="notification-inbox-copy"><span className="notification-inbox-title"><b>{item.title}</b>{priority === "HIGH" && <em>Important</em>}</span><span>{item.body}</span><small>{item.channel.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString()}</small></span>
            </button>;
          })}
      </div>
      <footer className="notification-inbox-footer">Important updates are shown first. Tap any item to mark it as read.</footer>
    </section>}
    <style jsx>{`
      .notification-inbox-wrap{position:relative;display:inline-flex}
      .notification-live-toast{position:fixed;top:84px;left:50%;transform:translateX(-50%);z-index:150;width:min(430px,calc(100vw - 24px));display:flex;align-items:flex-start;gap:11px;padding:13px 14px;border:1px solid var(--border,rgba(255,255,255,.16));border-radius:16px;background:var(--card,#171b29);color:var(--foreground,inherit);box-shadow:0 16px 50px rgba(0,0,0,.3);text-align:left;cursor:pointer;animation:notification-pop .22s ease-out}
      .notification-live-icon{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:grid;place-items:center;background:rgba(90,120,255,.16);color:#7fa3ff}
      .notification-live-copy{min-width:0;display:grid;gap:4px}.notification-live-copy b{font-size:12px}.notification-live-copy small{font-size:12px;line-height:1.4;opacity:.8;overflow-wrap:anywhere}.notification-live-copy em{font-style:normal;font-size:10px;color:#8caaff}
      .notification-live-close{margin-left:auto;font-size:20px;line-height:18px;opacity:.65}
      @keyframes notification-pop{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}
      .notification-inbox-trigger{position:relative;width:40px;height:40px;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:13px;background:var(--surface,rgba(255,255,255,.04));color:inherit;display:grid;place-items:center;cursor:pointer}
      .notification-inbox-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:99px;background:#e34d68;color:white;font:700 10px/18px system-ui;text-align:center;border:2px solid var(--background,#10121a)}
      .notification-inbox-panel{position:fixed;left:50%;right:auto;top:76px;transform:translateX(-50%);width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 96px);z-index:120;background:var(--card,#151824);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden;color:var(--foreground,inherit)}
      .notification-inbox-header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border,rgba(255,255,255,.1))}
      .notification-inbox-header b{display:block;font-size:14px}.notification-inbox-header small{display:block;margin-top:4px;opacity:.65;font-size:11px}
      .notification-inbox-actions{display:flex;gap:5px}.notification-inbox-actions button{display:grid;place-items:center;width:29px;height:29px;border:0;border-radius:8px;background:rgba(255,255,255,.06);color:inherit;cursor:pointer}
      .notification-inbox-filters{display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border,rgba(255,255,255,.08))}
      .notification-inbox-filters button{display:flex;align-items:center;gap:6px;border:0;border-radius:99px;padding:7px 11px;background:transparent;color:inherit;font-size:11px;opacity:.7;cursor:pointer}
      .notification-inbox-filters button.active{background:rgba(75,125,255,.14);color:#6fa0ff;opacity:1;font-weight:700}
      .notification-inbox-filters span{font-size:10px;opacity:.7}
      .notification-inbox-list{max-height:min(420px,calc(100dvh - 250px));overflow:auto}
      .notification-inbox-item{width:100%;display:flex;gap:10px;text-align:left;padding:13px 15px;border:0;border-bottom:1px solid var(--border,rgba(255,255,255,.07));background:transparent;color:inherit;cursor:pointer}
      .notification-inbox-item:hover{background:rgba(255,255,255,.04)}.notification-inbox-item.is-unread{background:rgba(100,120,255,.07)}
      .notification-inbox-item.priority-high{border-left:3px solid #e4a23b;padding-left:12px}
      .notification-inbox-dot{width:7px;height:7px;flex:0 0 7px;margin-top:5px;border-radius:50%;background:#8a75ff}.is-read .notification-inbox-dot{background:transparent;border:1px solid rgba(255,255,255,.25)}
      .notification-inbox-copy{min-width:0;display:grid;gap:5px}.notification-inbox-copy b{font-size:12px}.notification-inbox-title{display:flex;align-items:center;gap:7px}.notification-inbox-title em{font-style:normal;font-size:9px;font-weight:700;color:#e4a23b;background:rgba(228,162,59,.13);padding:3px 6px;border-radius:99px}.notification-inbox-copy>span:not(.notification-inbox-title){font-size:12px;line-height:1.45;opacity:.8;overflow-wrap:anywhere}.notification-inbox-copy small{font-size:10px;opacity:.55;text-transform:capitalize}
      .notification-inbox-empty{padding:24px 18px;text-align:center;font-size:12px;line-height:1.5;opacity:.65}
      .notification-inbox-footer{padding:10px 15px;font-size:10px;opacity:.55;border-top:1px solid var(--border,rgba(255,255,255,.08))}
      .notification-inbox-error{margin:10px 14px;color:#f87171;font-size:12px}
    `}</style>
  </div>;
}
