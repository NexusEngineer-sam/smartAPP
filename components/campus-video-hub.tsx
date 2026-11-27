"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Heart, MessageCircle, Play, UploadCloud, Video, X } from "lucide-react";

type CampusVideo = {
  id: string; videoUrl: string; thumbnailUrl: string | null; caption: string;
  category: string; durationSeconds: number; views: number; createdAt: string;
  user: { id: string; name: string; role: string; avatarUrl: string | null };
};

const categories = ["Campus", "Education", "Technology", "Events", "Entertainment", "Sports"];

export default function CampusVideoHub() {
  const [videos, setVideos] = useState<CampusVideo[]>([]);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Campus");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [played, setPlayed] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const response = await fetch("/api/videos", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setVideos(data.videos || []);
    }
  }
  useEffect(() => { void load(); }, []);

  function chooseFile(next: File | null) {
    setError(""); setNotice(""); setFile(next); setDuration(0);
    if (!next) return;
    if (!next.type.startsWith("video/")) { setError("Chagua video file, si picha au document."); setFile(null); return; }
    if (next.size > 100 * 1024 * 1024) { setError("Video imezidi 100 MB."); setFile(null); return; }
    const url = URL.createObjectURL(next);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      const seconds = Number.isFinite(probe.duration) ? Math.ceil(probe.duration) : 0;
      URL.revokeObjectURL(url);
      if (seconds > 300) { setError("Video iwe dakika 5 au chini."); setFile(null); return; }
      setDuration(seconds);
    };
    probe.onerror = () => { URL.revokeObjectURL(url); setError("Imeshindikana kusoma video hii."); setFile(null); };
    probe.src = url;
  }

  async function upload() {
    if (!file) { setError("Chagua video kwanza."); return; }
    if (duration <= 0 || duration > 300) { setError("Video haijathibitishwa au imezidi dakika 5."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const sigResponse = await fetch("/api/videos/signature", { method: "POST" });
      const sig = await sigResponse.json();
      if (!sigResponse.ok) throw new Error(sig.error || "Video storage haijawekwa.");
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("folder", sig.folder);
      form.append("signature", sig.signature);
      const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/video/upload`, { method: "POST", body: form });
      const cloud = await cloudResponse.json();
      if (!cloudResponse.ok) throw new Error(cloud.error?.message || "Video upload imeshindikana.");
      const saveResponse = await fetch("/api/videos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: cloud.public_id, videoUrl: cloud.secure_url,
          thumbnailUrl: cloud.thumbnail_url || "", caption, category,
          durationSeconds: Math.ceil(cloud.duration || duration), bytes: cloud.bytes,
        }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || "Video imepakiwa lakini haijahifadhiwa kwenye feed.");
      setVideos(current => [saved.video, ...current]);
      setFile(null); setCaption(""); setDuration(0); setCategory("Campus");
      if (fileRef.current) fileRef.current.value = "";
      setNotice("Video yako imechapishwa kwenye Campus Video Hub.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuna tatizo wakati wa kupakia video.");
    } finally { setBusy(false); }
  }

  async function countView(id: string) {
    if (played.includes(id)) return;
    setPlayed(current => [...current, id]);
    setVideos(current => current.map(v => v.id === id ? { ...v, views: v.views + 1 } : v));
    void fetch("/api/videos/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoId: id }) });
  }

  return <section className="video-hub" id="campus-video">
    <div className="video-hub-head">
      <div><span className="eyebrow">CAMPUS COMMUNITY MEDIA</span><h2>Campus Video Hub</h2><p>Share knowledge, moments and campus stories.</p></div>
      <span className="video-live"><i/> VIDEO FEED</span>
    </div>
    <div className="video-compose">
      <div className="video-compose-title"><span className="video-compose-icon"><Video size={19}/></span><div><b>Share a campus video</b><small>MP4, MOV or WebM · Maximum 100 MB · Up to 5 minutes</small></div></div>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={500} placeholder="What's happening on campus? Add a caption…" />
      <div className="video-compose-actions">
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Video category">{categories.map(x => <option key={x}>{x}</option>)}</select>
        <button type="button" className="video-pick-btn" onClick={() => fileRef.current?.click()}><Film size={16}/>{file ? file.name : "Choose video"}</button>
        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden onChange={e => chooseFile(e.target.files?.[0] || null)} />
        <button type="button" className="video-publish-btn" onClick={upload} disabled={busy || !file}><UploadCloud size={16}/>{busy ? "Uploading…" : "Publish video"}</button>
      </div>
      {file && <div className="video-file-info">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB · {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}</div>}
      {error && <p className="video-error">{error}</p>}
      {notice && <p className="video-success">{notice}</p>}
    </div>
    <div className="video-feed-heading"><div><h3>Latest campus videos</h3><p>Recent posts from the campus community</p></div><span>{videos.length} videos</span></div>
    {videos.length === 0 ? <div className="video-empty"><Play size={24}/><b>No videos yet</b><span>Be the first to share something with your campus.</span></div> :
      <div className="video-grid">{videos.map(video => <article className="video-card" key={video.id}>
        <div className="video-frame"><video src={video.videoUrl} poster={video.thumbnailUrl || undefined} controls playsInline preload="metadata" onPlay={() => void countView(video.id)} /></div>
        <div className="video-card-body">
          <div className="video-author"><span className="video-avatar">{video.user.avatarUrl ? <img src={video.user.avatarUrl} alt=""/> : video.user.name.slice(0, 1).toUpperCase()}</span><div><b>{video.user.name}</b><small>{video.user.role.toLowerCase()} · {new Date(video.createdAt).toLocaleDateString()}</small></div></div>
          {video.caption && <p className="video-caption">{video.caption}</p>}
          <div className="video-card-meta"><span>{video.category}</span><span><Play size={13}/> {video.views} views</span></div>
        </div>
      </article>)}</div>}
  </section>;
}
