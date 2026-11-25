"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { googleSignIn, passwordLogin, passwordRegister } from "@/lib/auth-client";
import { messages } from "@servicehub/shared/messages/en";
import { BrandLogo } from "@/components/brand-logo";

declare global { interface Window { google?: { accounts: { id: { initialize(options: { client_id: string; callback(result: { credential: string }): void }): void; renderButton(element: HTMLElement, options: { theme: string; size: string; shape: string; width: number }): void } } } } }
type Props = { mode: "SIGN_IN" | "SIGN_UP" };
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;
  return value;
}
function dashboard(user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }) {
  if (user?.requiresAdminTotpEnrollment) return "/admin/security";
  if (user?.roles?.some(role => role === "ADMIN" || role === "SUPER_ADMIN")) return "/admin";
  return user?.roles?.includes("TECHNICIAN") ? "/technician" : "/app";
}
export function AuthEntry({ mode }: Props) {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [destination, setDestination] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const t = messages.auth;
  const isSignUp = mode === "SIGN_UP";

  const start = useCallback(async (idToken?: string) => {
    setError(""); setPhoneError("");
    if (isSignUp && !name.trim()) { setError(t.fullNameRequired); return; }
    if (isSignUp && !consent) { setError(t.consentRequired); return; }
    if (!idToken && password.length < 8) { setError(t.passwordTooShort); return; }
    const normalized = emailMode ? destination.trim().toLowerCase() : normalizePhone(destination);
    const valid = emailMode ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized) : /^\+234[789]\d{9}$/.test(normalized);
    if (!valid) { setPhoneError(emailMode ? t.emailInvalid : t.phoneInvalid); return; }
    setBusy(true);
    try {
      if (idToken) {
        const result = await googleSignIn({ idToken, acceptTerms: isSignUp && consent, acceptPrivacy: isSignUp && consent, flow: mode });
        if (result.requiresTotp) { sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: "", purpose: "SIGN_IN", challengeToken: result.challengeToken })); router.push("/verify"); return; }
        if (result.isNewUser) router.push("/welcome"); else router.push(dashboard(result.user));
        return;
      }
      const result = isSignUp
        ? await passwordRegister({ identifier: normalized, displayName: name.trim(), password, acceptTerms: true, acceptPrivacy: true })
        : await passwordLogin({ identifier: normalized, password });
      if (result.requiresTotp && result.challengeToken) {
        sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: normalized, purpose: "SIGN_IN", challengeToken: result.challengeToken }));
        router.push("/verify");
        return;
      }
      if (result.isNewUser) { sessionStorage.setItem("servicehub-dev-verification", "skipped"); router.push("/welcome"); }
      else router.push(dashboard(result.user));
    } catch (e) { setError(e instanceof Error ? e.message : t.networkRetry); }
    finally { setBusy(false); }
  }, [consent, destination, emailMode, isSignUp, mode, name, password, router, t]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const render = () => {
      const el = document.getElementById("google-sign-in");
      if (!el || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => void start(credential) });
      window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "rectangular", width: Math.min(340, el.clientWidth || 340) });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) { existing.addEventListener("load", render); render(); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.dataset.googleIdentity = "true"; script.onload = render; document.head.appendChild(script);
  }, [start]);

  return <main className="auth-page"><section className="auth-card" style={{ maxWidth: "420px" }}>
    <BrandLogo className="auth-brand" />
    <p className="eyebrow">{t.localHelp}</p>
    <h1>{isSignUp ? t.createTitle : t.signInTitle}</h1>
    <p className="subtle">{isSignUp ? t.createSubtitle : t.signInSubtitle}</p>
    <div className="stack">
      <label className="field auth-field"><span className="field-label">{t.contact}</span><div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--surface)" }}>
        {!emailMode && <span style={{ padding: "0 12px", color: "var(--text-secondary)", borderRight: "1px solid var(--border)" }}>+234</span>}
        <input className="input" style={{ border: "none", background: "transparent", padding: "10px 12px" }} value={destination} onChange={e => { setDestination(e.target.value); setPhoneError(""); }} type={emailMode ? "email" : "tel"} inputMode={emailMode ? "email" : "tel"} autoComplete={emailMode ? "email" : "tel"} aria-label={emailMode ? t.email : t.phone} placeholder={emailMode ? t.emailPlaceholder : t.phonePlaceholder} />
      </div>{phoneError && <p className="form-error" role="alert">{phoneError}</p>}</label>
      {isSignUp && <label className="field auth-field"><span className="field-label">{t.fullName}</span><input className="input" autoComplete="name" value={name} onChange={e => setName(e.target.value)} aria-label={t.fullName} /></label>}
      <label className="field auth-field"><span className="field-label">{t.password}</span><input className="input" type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} aria-label={t.password} minLength={8} /></label>
      {isSignUp && <label className="check-row"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{t.consent} <Link href="/terms" target="_blank">{messages.terms}</Link> {t.and} <Link href="/privacy" target="_blank">{messages.privacy}</Link>.</label>}
      {error && <p className="form-error" role="alert">{error} <button className="link-button inline" onClick={() => void start()}>{t.retry}</button></p>}
      <button className="button button-primary auth-submit" disabled={busy || !destination || password.length < 8 || (isSignUp && (!name.trim() || !consent))} onClick={() => void start()}>{busy ? t.pleaseWait : t.continue}</button>
      <button className="link-button auth-submit" onClick={() => { setEmailMode(!emailMode); setDestination(""); setPhoneError(""); setError(""); }}>{emailMode ? t.usePhone : t.useEmail}</button>
      <div className="auth-divider"><span>{t.orContinueWith}</span></div><div id="google-sign-in" className="google-button-slot" aria-label={t.continueWithGoogle} />
      {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <button className="button button-secondary auth-submit" disabled>{t.continueWithGoogle} · {t.comingSoon}</button>}
      <p className="auth-switch">{isSignUp ? <>{t.alreadyHaveAccount} <Link className="link-button inline" href="/sign-in">{t.signIn}</Link></> : <>{t.newHere} <Link className="link-button inline" href="/sign-up">{t.createAccount}</Link></>}</p>
    </div>
  </section></main>;
}
