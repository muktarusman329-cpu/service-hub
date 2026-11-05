"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { messages } from "@servicehub/shared/messages/en";

export default function FinishAccountPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function finishAccount() {
    setError("");
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!consent) {
      setError("You must agree to the Terms and Privacy Policy");
      return;
    }
    setBusy(true);
    try {
      const raw = sessionStorage.getItem("servicehub-auth");
      if (!raw) throw new Error("Session expired. Please sign in again.");
      const pending = JSON.parse(raw) as { destination: string };
      await authFetch<{ user: { roles: string[] } }>("/auth/otp/complete-account", {
        method: "POST",
        body: JSON.stringify({ destination: pending.destination, displayName: name.trim() })
      });
      sessionStorage.removeItem("servicehub-auth");
      router.push("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't complete your account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/">ServiceHub</Link>
        <p className="eyebrow">Almost done</p>
        <h1>{messages.auth.finishAccount}</h1>
        <p className="subtle">{messages.auth.finishAccountSubtitle}</p>
        
        <div className="stack">
          <label className="field auth-field">
            <span className="field-label">{messages.auth.fullName}</span>
            <input 
              className="input" 
              autoComplete="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Fatima Ibrahim"
            />
          </label>
          
          <label className="check-row consent-row">
            <input 
              type="checkbox" 
              checked={consent} 
              onChange={(e) => setConsent(e.target.checked)} 
            />
            <span>
              {messages.auth.consent}{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
            </span>
          </label>
          
          {error && <p className="form-error" role="alert">{error}</p>}
          
          <button 
            className="button button-primary auth-submit" 
            onClick={finishAccount} 
            disabled={busy || !name.trim() || !consent}
          >
            {busy ? messages.auth.pleaseWait : messages.auth.continue}
          </button>
          
          <Link className="link-button back-link" href="/sign-in">
            {messages.auth.backToSignIn}
          </Link>
        </div>
      </section>
    </main>
  );
}
