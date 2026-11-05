"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { authFetch, googleSignIn, requestOtp } from "@/lib/auth-client";
import { messages } from "@servicehub/shared/messages/en";

declare global { interface Window { google?: { accounts: { id: { initialize(options: { client_id: string; callback(result: { credential: string }): void }): void; renderButton(element: HTMLElement, options: { theme: string; size: string; shape: string; width: number }): void } } } } }

function normalizePhone(input: string): string {
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+234${cleaned}`;
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  return input;
}

function isValidPhone(input: string): boolean {
  const normalized = normalizePhone(input);
  return /^\+234[789]\d{9}$/.test(normalized);
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const becomeTechnicianHint = searchParams.get("become-technician") === "true";
  const [emailMode, setEmailMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState("");
  const [destination, setDestination] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode() {
    setError("");
    setPhoneError("");
    if (passwordMode && (!emailMode)) return;
    if (!emailMode && !isValidPhone(destination)) {
      setPhoneError(messages.auth.phoneInvalid);
      return;
    }
    if (emailMode && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const normalizedDestination = emailMode ? destination.trim().toLowerCase() : normalizePhone(destination);
      if (passwordMode) {
        const result = await authFetch<{ user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }; requiresTotp?: boolean; challengeToken?: string }>("/auth/password/login", { method: "POST", body: JSON.stringify({ email: normalizedDestination, password }) });
        if (result.requiresTotp) {
          if (!result.challengeToken) throw new Error("The sign-in challenge is incomplete. Try again.");
          sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: "", purpose: "SIGN_IN", challengeToken: result.challengeToken }));
          router.push("/verify");
        } else routeUser(result.user);
        return;
      }
      const purpose = "SIGN_IN";
      await requestOtp({ destination: normalizedDestination, purpose, ...(becomeTechnicianHint ? { accountType: "TECHNICIAN" } : {}) });
      sessionStorage.setItem("servicehub-auth", JSON.stringify({ destination: normalizedDestination, purpose, becomeTechnician: becomeTechnicianHint }));
      router.push("/verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send a code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const routeUser = useCallback((user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }) => {
    sessionStorage.removeItem("servicehub-auth");
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
          const result = await googleSignIn({ idToken: credential, acceptTerms: true, acceptPrivacy: true });
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
  }, [router, routeUser]);

  const isPhoneValid = emailMode ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination.trim()) : isValidPhone(destination);

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ maxWidth: "420px" }}>
        <Link className="brand auth-brand" href="/">ServiceHub</Link>
        <p className="eyebrow">Local help in Minna</p>
        <h1>{messages.auth.signInOrCreate}</h1>
        <p className="subtle">{emailMode ? messages.auth.signInOrCreateSubtitle.replace("phone number", "email address") : messages.auth.signInOrCreateSubtitle}</p>
        
        <div className="stack">
          <label className="field auth-field">
            <span className="field-label">{emailMode ? messages.auth.email : messages.auth.phone}</span>
            <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-control)", background: "var(--surface)" }}>
              {!emailMode && <span style={{ padding: "0 12px", color: "var(--text-secondary)", borderRight: "1px solid var(--border)" }}>+234</span>}
              <input 
                className="input" 
                style={{ border: "none", background: "transparent", padding: emailMode ? "10px 12px" : "0 12px" }}
                value={destination} 
                onChange={(e) => { setDestination(e.target.value); setPhoneError(""); }}
                type={emailMode ? "email" : "tel"} 
                inputMode={emailMode ? "email" : "tel"} 
                autoComplete={emailMode ? "email" : "tel"} 
                placeholder={emailMode ? messages.auth.emailPlaceholder : messages.auth.phonePlaceholder}
                autoFocus={!emailMode}
                onBlur={() => { if (!emailMode && destination && !isValidPhone(destination)) setPhoneError(messages.auth.phoneInvalid); }}
              />
            </div>
            {phoneError && <p className="form-error" role="alert">{phoneError}</p>}
          </label>
          
          {emailMode && passwordMode && (
            <label className="field auth-field">
              <span className="field-label">{messages.auth.password}</span>
              <input 
                className="input" 
                type="password" 
                autoComplete="current-password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </label>
          )}
          
          {error && <p className="form-error" role="alert">{error}</p>}
          
          <button 
            className="button button-primary auth-submit" 
            onClick={requestCode} 
            disabled={busy || !destination || !isPhoneValid || (passwordMode && !password)}
          >
            {busy ? messages.auth.pleaseWait : passwordMode ? messages.auth.signIn : messages.auth.continue}
          </button>
          
          <button 
            className="link-button auth-submit" 
            onClick={() => { 
              setEmailMode(!emailMode); 
              setPasswordMode(false); 
              setPassword(""); 
              setDestination(""); 
              setError(""); 
              setPhoneError("");
            }}
          >
            {emailMode ? messages.auth.usePhone : messages.auth.useEmail}
          </button>
          
          {emailMode && !passwordMode && (
            <button 
              className="link-button auth-submit" 
              onClick={() => setPasswordMode(!passwordMode)}
            >
              {passwordMode ? messages.auth.useOtp : messages.auth.usePassword}
            </button>
          )}
          
          <div className="auth-divider">
            <span>{messages.auth.orContinueWith}</span>
          </div>
          
          <div id="google-sign-in" className="google-button-slot" aria-label={messages.auth.continueWithGoogle} />
          {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <button className="button button-secondary auth-submit" disabled>
              {messages.auth.continueWithGoogle} · coming soon
            </button>
          )}
          
          <p className="auth-switch">
            <Link href="/become-technician" className="link-button inline">{messages.auth.offeringServices}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<main className="auth-page"><section className="auth-card"><p className="subtle">{messages.loading}</p></section></main>}>
    <SignInContent />
  </Suspense>;
}
