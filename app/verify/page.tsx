"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, ShieldAlert, LoaderCircle } from "lucide-react";

type Result = { valid: boolean; error?: string; identity?: { name: string; role: string }; verifiedAt?: string };

function VerifyContent() {
  const params = useSearchParams();
  const started = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    if (!token) {
      setResult({ valid: false, error: "No campus pass was provided." });
      setLoading(false);
      return;
    }
    let active = true;
    fetch("/api/identity/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    }).then(async response => {
      const data = await response.json();
      if (active) setResult(data);
    }).catch(() => {
      if (active) setResult({ valid: false, error: "Verification could not be completed. Check your connection." });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [params]);

  return <main className="verify-shell">
    <section className="verify-card">
      <div className="verify-brand">SAMWEL <b>CAMPUS OS</b></div>
      {loading ? <><LoaderCircle className="verify-loader" size={42}/><h1>Verifying campus pass</h1><p>Please wait while we check this pass securely.</p></> :
        result?.valid ? <><ShieldCheck className="verify-success" size={54}/><span className="verify-status">IDENTITY VERIFIED</span><h1>{result.identity?.name}</h1><p className="verify-role">{result.identity?.role?.replaceAll("_", " ")}</p><p>This one-time campus pass was successfully verified.</p></> :
        <><ShieldAlert className="verify-failed" size={54}/><span className="verify-status failed">VERIFICATION FAILED</span><h1>Pass not valid</h1><p>{result?.error || "This pass could not be verified."}</p></>}
      <small>Secure one-time verification · SAMWEL CAMPUS OS</small>
    </section>
  </main>;
}

export default function VerifyPage() {
  return <Suspense fallback={<main className="verify-shell"><section className="verify-card"><LoaderCircle className="verify-loader" size={42}/><h1>Loading secure verification</h1></section></main>}><VerifyContent /></Suspense>;
}
