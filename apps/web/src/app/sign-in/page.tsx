"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

declare global { interface Window { google?: { accounts: { id: { initialize(options: { client_id: string; callback(result: { credential: string }): void }): void; renderButton(element: HTMLElement, options: { theme: string; size: string; shape: string; width: number }): void } } } } }

export default function SignInPage() {
  const router = useRouter();
  const [emailMode, setEmailMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [technician, setTechnician] = useState(false);
  const [destination, setDestination] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setError(""); setBusy(true);
    try {
      if (passwordMode) {
        const result = await authFetch("/auth/password/login", { method: "POST", body: JSON.stringify({ email: destination, password }) });
        if (result.requiresTotp) {
          sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: "", purpose: "SIGN_IN", challengeToken: result.challengeToken }));
          router.push("/verify"); return;
        }
        routeUser(result.user); return;
      }
      await authFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ destination, purpose: signup ? "SIGN_UP" : "SIGN_IN", displayName: name, accountType: technician ? "TECHNICIAN" : "USER", acceptTerms: consent, acceptPrivacy: consent }) });
      sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination, purpose: signup ? "SIGN_UP" : "SIGN_IN" }));
      router.push("/verify");
    } catch (e) { setError(e instanceof Error ? e.message : "We could not send a code. Try again."); }
    finally { setBusy(false); }
  }

  const routeUser = useCallback((user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }) => {
    if (user?.requiresAdminTotpEnrollment) router.push("/admin/security");
    else router.push(user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("ADMIN") ? "/admin" : user?.roles?.includes("TECHNICIAN") ? "/technician" : "/app");
  }, [router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const render = () => {
      const el = document.getElementById("google-sign-in");
      if (!el || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        try {
          setBusy(true); setError("");
          const result = await authFetch("/auth/google", { method: "POST", body: JSON.stringify({ idToken: credential, acceptTerms: consent, acceptPrivacy: consent }) });
          if (result.requiresTotp) {
            sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: "", purpose: "SIGN_IN", challengeToken: result.challengeToken }));
            router.push("/verify"); return;
          }
          const { user } = result;
          routeUser(user);
        } catch (e) { setError(e instanceof Error ? e.message : "Google sign-in could not be completed."); }
        finally { setBusy(false); }
      } });
      window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "rectangular", width: Math.min(340, el.clientWidth || 340) });
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) { existing.addEventListener("load", render); render(); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.dataset.googleIdentity = "true"; script.onload = render; document.head.appendChild(script);
  }, [consent, router, routeUser]);

  return <main className="auth-page"><section className="auth-card">
    <Link className="brand auth-brand" href="/"><span className="brand-mark">S</span>ServiceHub</Link>
    <p className="eyebrow">Local help in Minna</p><h1>{signup ? "Create your account" : "Welcome back"}</h1>
    <p className="subtle">{passwordMode ? "Sign in with your email and password." : `Use your ${emailMode ? "email address" : "phone number"} to get a one-time sign-in code.`}</p>
    {signup && <label className="field auth-field"><span className="field-label">Your name</span><input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /></label>}
    <label className="field auth-field"><span className="field-label">{emailMode ? "Email address" : "Phone number"}</span><input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} type={emailMode ? "email" : "tel"} inputMode={emailMode ? "email" : "tel"} autoComplete={emailMode ? "email" : "tel"} placeholder={emailMode ? "you@example.com" : "+234 800 000 0000"} /></label>
    {emailMode && passwordMode && <label className="field auth-field"><span className="field-label">Password</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>}
    {signup && <label className="check-row"><input type="checkbox" checked={technician} onChange={(e) => setTechnician(e.target.checked)} /><span>I want to offer services as a technician</span></label>}
    <label className="check-row consent-row"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link> for a new account.</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary auth-submit" onClick={requestCode} disabled={busy || !destination || (signup && (!consent || !name.trim())) || (passwordMode && !password)}>{busy ? "Please wait…" : passwordMode ? "Sign in" : "Continue"}</button>
    <button className="link-button" onClick={() => { setEmailMode(!emailMode); setPasswordMode(false); setPassword(""); setDestination(""); setError(""); }}>{emailMode ? "Use phone number instead" : "Use email instead"}</button>
    {emailMode && !signup && <button className="link-button" onClick={() => setPasswordMode(!passwordMode)}>{passwordMode ? "Use email code instead" : "Use password instead"}</button>}
    <div className="auth-divider"><span>or continue with</span></div>
    <div id="google-sign-in" className="google-button-slot" aria-label="Continue with Google" />
    {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && <button className="button button-secondary auth-submit" disabled>Continue with Google · coming soon</button>}
    <p className="auth-switch">{signup ? "Already have an account?" : "New to ServiceHub?"} <button className="link-button inline" onClick={() => { setSignup(!signup); setPasswordMode(false); setPassword(""); setError(""); }}>{signup ? "Sign in" : "Create an account"}</button></p>
    <p className="auth-foot">By continuing, we’ll use your details to keep your account secure.</p>
  </section></main>;
}
