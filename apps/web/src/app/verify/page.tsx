"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";

type PendingAuth = { destination: string; purpose: "SIGN_IN" | "SIGN_UP"; challengeToken?: string };
export default function VerifyPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(60);
  const [challenge, setChallenge] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { const raw = sessionStorage.getItem("servicehub-auth"); if (raw) { const value = JSON.parse(raw) as PendingAuth; setPending(value); if (value.challengeToken) setChallenge(value.challengeToken); } }, []);
  useEffect(() => { if (seconds <= 0) return; const timer = window.setTimeout(() => setSeconds((n) => n - 1), 1000); return () => window.clearTimeout(timer); }, [seconds]);
  const code = digits.join("");

  async function submit(value = code) {
    if ((!challenge || !recoveryMode) && value.length !== 6 || challenge && recoveryMode && value.trim().length < 8 || !pending || busy) return;
    setBusy(true); setError("");
    try {
      if (challenge) {
        const result = await authFetch("/auth/totp/verify-login", { method: "POST", body: JSON.stringify({ challengeToken: challenge, code: value }) });
        finish(result.user);
      } else {
        const result = await authFetch("/auth/otp/verify", { method: "POST", body: JSON.stringify({ destination: pending.destination, purpose: pending.purpose, code: value }) });
        if (result.requiresTotp) { setChallenge(result.challengeToken); setDigits(["", "", "", "", "", ""]); setError(""); inputs.current[0]?.focus(); }
        else finish(result.user);
      }
    } catch (e) { setDigits(["", "", "", "", "", ""]); inputs.current[0]?.focus(); setError(e instanceof Error ? e.message : "That code could not be verified. Try again."); }
    finally { setBusy(false); }
  }
  function finish(user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }) {
    sessionStorage.removeItem("servicehub-auth");
    if (user?.requiresAdminTotpEnrollment) router.replace("/admin/security");
    else if (user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("ADMIN")) router.replace("/admin");
    else if (user?.roles?.includes("TECHNICIAN")) router.replace("/technician");
    else router.replace("/app");
  }
  function update(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[index] = value; setDigits(next); setError("");
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (value && index === 5 && next.every(Boolean)) void submit(next.join(""));
  }
  function paste(event: ClipboardEvent<HTMLInputElement>) { const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); if (!value) return; event.preventDefault(); const next = Array.from({ length: 6 }, (_, i) => value[i] || ""); setDigits(next); setError(""); inputs.current[Math.min(value.length, 5)]?.focus(); if (value.length === 6) void submit(value); }
  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) { if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus(); }
  async function resend() {
    if (!pending || seconds > 0 || challenge) return;
    setError(""); setSeconds(60);
    try { await authFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ destination: pending.destination, purpose: pending.purpose }) }); }
    catch (e) { setError(e instanceof Error ? e.message : "We could not send a new code."); }
  }

  if (!pending) return <main className="auth-page"><section className="auth-card"><h1>Check your details</h1><p className="subtle">Return to sign in and request a new code.</p><Link className="button button-primary auth-submit" href="/sign-in">Back to sign in</Link></section></main>;
  return <main className="auth-page"><section className="auth-card">
    <Link className="brand auth-brand" href="/">ServiceHub</Link>
    <p className="eyebrow">Account security</p><h1>{challenge ? "Two-step verification" : "Enter your code"}</h1>
    <p className="subtle">{challenge ? "Enter the code from your authenticator app, or a recovery code." : <>We sent a six-digit code to <strong>{pending.destination}</strong>.</>}</p>
    {challenge && recoveryMode ? <input className="input recovery-input" aria-label="Recovery code" autoComplete="one-time-code" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())} placeholder="Recovery code" /> : <div className="otp-inputs" role="group" aria-label="Six digit verification code">{digits.map((digit, index) => <input key={index} ref={(el) => { inputs.current[index] = el; }} className="input otp-input" aria-label={`Digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={digit} onChange={(e) => update(index, e.target.value)} onKeyDown={(e) => keyDown(index, e)} onPaste={paste} />)}</div>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary auth-submit" onClick={() => submit(challenge && recoveryMode ? recoveryCode : code)} disabled={(challenge && recoveryMode ? recoveryCode.trim().length < 8 : code.length !== 6) || busy}>{busy ? "Checking…" : "Verify and continue"}</button>
    {challenge && <button className="link-button auth-submit" onClick={() => { setRecoveryMode(!recoveryMode); setRecoveryCode(""); setDigits(["", "", "", "", "", ""]); }}>{recoveryMode ? "Use authenticator code" : "Use a recovery code"}</button>}
    {!challenge && <p className="resend-row">Didn’t get a code? <button className="link-button inline" onClick={resend} disabled={seconds > 0}>{seconds > 0 ? `Resend in ${seconds}s` : "Send a new code"}</button></p>}
    <Link className="link-button back-link" href="/sign-in">Use different details</Link>
  </section></main>;
}
