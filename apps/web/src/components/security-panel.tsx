"use client";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { CopyButton } from "./copy-button";

type User = { id: string; phone: string | null; email: string | null; phoneVerified: boolean; emailVerified: boolean; otpChannel: string; googleLinked: boolean; roles: string[]; totpEnabled: boolean };
type Session = { id: string; deviceLabel: string | null; userAgent: string | null; lastSeenAt: string; createdAt: string };

export function SecurityPanel({ admin = false }: { admin?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [linkDestination, setLinkDestination] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try { 
      const [me, active] = await Promise.all([authFetch("/auth/me"), authFetch("/auth/sessions")]); 
      if (me && typeof me === "object" && "id" in me) setUser(me as User | null);
      if (Array.isArray(active)) setSessions(active as Session[]);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Sign in to view account security."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || user?.googleLinked) return;
    const render = () => {
      const el = document.getElementById("link-google-account");
      if (!el || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        setBusy(true); setError("");
        try { await authFetch("/auth/methods/google/link", { method: "POST", body: JSON.stringify({ idToken: credential }) }); setMessage("Google sign-in linked."); await refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : "Could not link Google sign-in."); }
        finally { setBusy(false); }
      } });
      window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "rectangular", width: Math.min(340, el.clientWidth || 340) });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) { existing.addEventListener("load", render); render(); return () => existing.removeEventListener("load", render); }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.dataset.googleIdentity = "true"; script.onload = render; document.head.appendChild(script);
  }, [user?.googleLinked, refresh]);
  async function action(fn: () => Promise<void>) { setBusy(true); setError(""); setMessage(""); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Could not complete that action."); } finally { setBusy(false); } }
  async function startTotp() { await action(async () => { const value = await authFetch("/auth/totp/start", { method: "POST", body: "{}" }); if (value && typeof value === "object" && "secret" in value) setSecret(String(value.secret)); if (value && typeof value === "object" && "uri" in value) setUri(String(value.uri)); }); }
  async function confirmTotp() { await action(async () => { const value = await authFetch("/auth/totp/confirm", { method: "POST", body: JSON.stringify({ code }) }); if (value && typeof value === "object" && "recoveryCodes" in value && Array.isArray(value.recoveryCodes)) setRecovery(value.recoveryCodes.map(String)); setSecret(""); setUri(""); setCode(""); setMessage("Two-step verification is on. Save these recovery codes now."); await refresh(); }); }
  async function requestLink() { await action(async () => { await authFetch("/auth/methods/link/request", { method: "POST", body: JSON.stringify({ destination: linkDestination, purpose: linkDestination.includes("@") ? "LINK_EMAIL" : "LINK_PHONE" }) }); setMessage("If those details are available, a code has been sent."); }); }
  async function confirmLink() { await action(async () => { await authFetch("/auth/methods/link/verify", { method: "POST", body: JSON.stringify({ destination: linkDestination, code: linkCode, purpose: linkDestination.includes("@") ? "LINK_EMAIL" : "LINK_PHONE" }) }); setLinkCode(""); setLinkDestination(""); setMessage("Sign-in method linked."); await refresh(); }); }
  async function savePassword() { await action(async () => { await authFetch("/auth/password", { method: "POST", body: JSON.stringify({ password: newPassword }) }); setNewPassword(""); setMessage("Password added to your account."); }); }
  async function setOtpChannel(channel: string) { await action(async () => { await authFetch("/auth/otp-preference", { method: "POST", body: JSON.stringify({ channel }) }); setMessage("Code delivery preference saved."); await refresh(); }); }
  async function revoke(id: string) { await action(async () => { await authFetch(`/auth/sessions/${id}/revoke`, { method: "POST", body: "{}" }); setMessage("Device signed out."); await refresh(); }); }
  async function logoutAll() { await action(async () => { await authFetch("/auth/logout-everywhere", { method: "POST", body: "{}" }); setSessions([]); setMessage("All devices have been signed out."); }); }

  return <div className="security-stack">
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
    <section className="card security-card"><div className="section-head"><div><div className="eyebrow">Sign-in methods</div><h2>Linked to your account</h2></div></div>
      <div className="security-method"><div><strong>Phone</strong><div className="subtle">{user?.phone ? `${user.phone}${user.phoneVerified ? " · verified" : ""}` : "No phone linked"}</div></div><span className="method-mark">{user?.phoneVerified ? "Verified" : "—"}</span></div>
      <div className="security-method"><div><strong>Email</strong><div className="subtle">{user?.email ? `${user.email}${user.emailVerified ? " · verified" : ""}` : "No email linked"}</div></div><span className="method-mark">{user?.emailVerified ? "Verified" : "—"}</span></div>
      <div className="security-method"><div><strong>Google</strong><div className="subtle">{user?.googleLinked ? "Connected" : "Not connected"}</div></div><span className="method-mark">{user?.googleLinked ? "Linked" : "Optional"}</span></div>
      {!user?.googleLinked && <div className="google-link-row">{process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? <div id="link-google-account" className="google-button-slot" /> : <button className="button button-secondary" disabled>Connect Google · not configured</button>}</div>}
      <label className="field otp-preference"><span className="field-label">One-time code delivery</span><select className="input" value={user?.otpChannel || "AUTO"} onChange={(e) => setOtpChannel(e.target.value)} disabled={busy}><option value="AUTO">Recommended for this sign-in</option>{user?.phoneVerified && <><option value="WHATSAPP">WhatsApp</option><option value="SMS">Text message</option></>}{user?.emailVerified && <option value="EMAIL">Email</option>}</select></label>
      <div className="link-method-row"><input className="input" value={linkDestination} onChange={(e) => setLinkDestination(e.target.value)} placeholder="Phone number or email" aria-label="New phone or email"/><button className="button button-secondary" onClick={requestLink} disabled={busy || !linkDestination}>{busy ? "Sending…" : "Send proof code"}</button></div>
      {message.includes("code has been sent") && <div className="link-method-row"><input className="input" value={linkCode} onChange={(e) => setLinkCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" aria-label="Verification code"/><button className="button button-primary" onClick={confirmLink} disabled={busy || linkCode.length !== 6}>{busy ? "Verifying…" : "Verify and link"}</button></div>}
      {user?.emailVerified && <div className="password-setup"><label className="field"><span className="field-label">{newPassword ? "New password · 12 characters minimum" : "Email password"}</span><input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set or update a password" /></label><button className="button button-secondary" onClick={savePassword} disabled={busy || newPassword.length < 12}>{busy ? "Saving…" : "Save password"}</button></div>}
    </section>

    <section className="card security-card"><div className="section-head"><div><div className="eyebrow">Two-step verification</div><h2>{user?.totpEnabled ? "Authenticator is on" : "Protect your account"}</h2></div><span className="security-state">{user?.totpEnabled ? "On" : admin ? "Required" : "Optional"}</span></div>
      {user?.totpEnabled ? <p className="subtle">An authenticator code is required when you sign in. Recovery codes can be generated again after verifying your account.</p> : <><p className="subtle">Use an authenticator app to create a sign-in code. Admin tools stay locked until setup is complete.</p><button className="button button-primary" onClick={startTotp} disabled={busy}>{busy ? "Setting up…" : "Set up authenticator"}</button></>}
      {secret && <div className="totp-setup"><p><strong>1. Add this account to your authenticator app</strong></p><div className="secret-box"><code>{secret}</code><CopyButton text={secret} label="Copy secret" /></div><a className="subtle" href={uri}>Open authenticator setup link</a><p><strong>2. Enter the six-digit code from the app</strong></p><div className="link-method-row"><input className="input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" aria-label="Authenticator code" placeholder="000000"/><button className="button button-primary" onClick={confirmTotp} disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Confirm"}</button></div></div>}
      {recovery.length > 0 && <div className="recovery-box"><div className="section-head"><strong>Recovery codes · shown once</strong><CopyButton text={recovery.join("\n")} label="Copy all codes" /></div><div>{recovery.map((item) => <code key={item}>{item}</code>)}</div></div>}
    </section>

    <section className="card security-card"><div className="section-head"><div><div className="eyebrow">Active devices</div><h2>{sessions.length} active {sessions.length === 1 ? "session" : "sessions"}</h2></div>{sessions.length > 0 && <button className="button button-quiet" onClick={logoutAll} disabled={busy}>{busy ? "Signing out…" : "Sign out everywhere"}</button>}</div>
      {sessions.map((session) => <div className="security-method" key={session.id}><div><strong>{session.deviceLabel || session.userAgent?.slice(0, 56) || "Signed-in device"}</strong><div className="subtle">Last active {new Date(session.lastSeenAt).toLocaleString()}</div></div><button className="link-button" onClick={() => revoke(session.id)} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button></div>)}
      {sessions.length === 0 && <p className="subtle">No active sessions found.</p>}
    </section>
  </div>;
}
