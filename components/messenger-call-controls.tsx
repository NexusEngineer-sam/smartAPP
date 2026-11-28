"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, Mic, MicOff } from "lucide-react";

type CallRow = {
  id: string; callerId: string; calleeId: string; kind: "AUDIO" | "VIDEO";
  status: string; offer: RTCSessionDescriptionInit | null; answer: RTCSessionDescriptionInit | null;
  callerCandidates: RTCIceCandidateInit[]; calleeCandidates: RTCIceCandidateInit[];
};
export default function MessengerCallControls({ conversationId, currentUserId }: { conversationId: string; currentUserId?: string }) {
  const [call, setCall] = useState<CallRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef("");
  const remoteCandidateCount = useRef(0);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const pendingLocalCandidates = useRef<RTCIceCandidateInit[]>([]);
  const active = call && ["RINGING", "ACCEPTED"].includes(call.status);
  const closeMedia = useCallback(() => {
    pcRef.current?.close(); pcRef.current = null;
    localRef.current?.getTracks().forEach(t => t.stop()); localRef.current = null;
    setRemoteStream(null); remoteCandidateCount.current = 0; pendingLocalCandidates.current = [];
  }, []);
  const sendUpdate = useCallback(async (body: object) => {
    const r = await fetch(`/api/messenger/${conversationId}/calls`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Call update failed");
  }, [conversationId]);
  const makePeer = useCallback(async (kind: "AUDIO" | "VIDEO") => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "VIDEO" });
    localRef.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] });
    pcRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.ontrack = event => { const incoming = event.streams[0]; setRemoteStream(incoming); if (remoteVideo.current) remoteVideo.current.srcObject = incoming; };
    pc.onicecandidate = event => { if (event.candidate) { const candidate = event.candidate.toJSON(); if (!callIdRef.current) pendingLocalCandidates.current.push(candidate); else void sendUpdate({ action: "candidate", candidate }).catch(e => setError(e.message)); } };
    return pc;
  }, [sendUpdate]);
  const start = async (kind: "AUDIO" | "VIDEO") => {
    setBusy(true); setError("");
    try {
      const pc = await makePeer(kind);
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      const r = await fetch(`/api/messenger/${conversationId}/calls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, offer }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not start call");
      callIdRef.current = d.callId;
      for (const candidate of pendingLocalCandidates.current.splice(0)) await sendUpdate({ action: "candidate", candidate });
      setCall({ id: d.callId, callerId: currentUserId || "", calleeId: "", kind, status: "RINGING", offer, answer: null, callerCandidates: [], calleeCandidates: [] });
    } catch (e) { closeMedia(); setError(e instanceof Error ? e.message : "Call failed"); }
    finally { setBusy(false); }
  };
  const accept = async (incoming: CallRow) => {
    setBusy(true); setError("");
    try {
      callIdRef.current = incoming.id;
      const pc = await makePeer(incoming.kind);
      await pc.setRemoteDescription(incoming.offer!);
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      await sendUpdate({ action: "accept", answer });
      for (const candidate of pendingLocalCandidates.current.splice(0)) await sendUpdate({ action: "candidate", candidate });
      setCall({ ...incoming, status: "ACCEPTED" });
    } catch (e) { closeMedia(); setError(e instanceof Error ? e.message : "Could not answer call"); }
    finally { setBusy(false); }
  };
  const finish = async (action: "end" | "reject" = "end") => {
    try { await sendUpdate({ action }); } catch (e) { setError(e instanceof Error ? e.message : "Could not end call"); }
    closeMedia(); setCall(null); callIdRef.current = "";
  };
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/messenger/${conversationId}/calls`, { cache: "no-store" });
        const d = await r.json(); if (!r.ok || !alive) return;
        const next: CallRow | null = d.call;
        if (!next || !["RINGING", "ACCEPTED"].includes(next.status)) {
          if (callIdRef.current && next?.id === callIdRef.current) { closeMedia(); setCall(null); callIdRef.current = ""; }
          else if (!callIdRef.current) setCall(null);
          return;
        }
        if (callIdRef.current && next.id !== callIdRef.current) return;
        setCall(next);
        const pc = pcRef.current;
        if (pc && next.status === "ACCEPTED" && next.callerId === currentUserId && next.answer && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(next.answer);
        }
        if (pc?.remoteDescription) {
          const candidates = next.callerId === currentUserId ? (next.calleeCandidates || []) : (next.callerCandidates || []);
          while (remoteCandidateCount.current < candidates.length) {
            const candidate = candidates[remoteCandidateCount.current++];
            try { await pc.addIceCandidate(candidate); } catch { /* candidate may arrive before SDP settles */ }
          }
        }
      } catch { /* retry on next poll */ }
    };
    void poll();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void poll(); }, 2500);
    return () => { alive = false; window.clearInterval(timer); closeMedia(); };
  }, [conversationId, currentUserId, closeMedia]);
  useEffect(() => { if (remoteVideo.current && remoteStream) remoteVideo.current.srcObject = remoteStream; if (remoteAudio.current && remoteStream) remoteAudio.current.srcObject = remoteStream; }, [remoteStream]);
  const incoming = !!call && call.calleeId === currentUserId && call.status === "RINGING";
  return <div className="nexus-call-controls">
    {!active && <><button type="button" title="Voice call" disabled={busy} onClick={() => void start("AUDIO")}><Phone size={17}/></button><button type="button" title="Video call" disabled={busy} onClick={() => void start("VIDEO")}><Video size={18}/></button></>}
    {active && <div className="nexus-call-panel">
      <strong>{incoming ? "Incoming call" : call.status === "RINGING" ? "Calling…" : "Call connected"}</strong>
      <audio ref={remoteAudio} autoPlay/>
      {call.kind === "VIDEO" && <div className="nexus-call-videos"><video ref={remoteVideo} autoPlay playsInline/><video ref={localVideo} autoPlay muted playsInline/></div>}
      {incoming ? <><button type="button" disabled={busy} onClick={() => void accept(call)}><Phone size={17}/> Answer</button><button type="button" onClick={() => void finish("reject")}><PhoneOff size={17}/> Decline</button></> :
        <><button type="button" onClick={() => { localRef.current?.getAudioTracks().forEach(t => t.enabled = muted); setMuted(!muted); }}>{muted ? <MicOff size={17}/> : <Mic size={17}/>}</button>{call.kind === "VIDEO" && <button type="button" onClick={() => { localRef.current?.getVideoTracks().forEach(t => t.enabled = cameraOff); setCameraOff(!cameraOff); }}><Video size={17}/></button>}<button type="button" onClick={() => void finish()}><PhoneOff size={17}/> End</button></>}
    </div>}
    {error && <small role="status">{error}</small>}
  </div>;
}
