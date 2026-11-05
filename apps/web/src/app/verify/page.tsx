"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { requestOtp, verifyOtp, verifyTotpLogin } from "@/lib/auth-client";
import { messages } from "@servicehub/shared/messages/en";

type PendingAuth = { 
  destination: string; 
  purpose: "SIGN_IN" | "SIGN_UP"; 
  challengeToken?: string;
  becomeTechnician?: boolean;
  isNewUser?: boolean;
};

function maskPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("234") && normalized.length === 13) {
    const lastSix = normalized.slice(-6);
    return `0${normalized.slice(4, 7)} *** ${lastSix}`;
  }
  if (normalized.length === 10) {
    const lastSix = normalized.slice(-6);
    return `0${normalized.slice(0, 3)} *** ${lastSix}`;
  }
  if (normalized.startsWith("0") && normalized.length === 11) {
    const lastSix = normalized.slice(-6);
    return `${normalized.slice(0, 4)} *** ${lastSix}`;
  }
  return phone;
}

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
  const [attempts, setAttempts] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => { 
    const raw = sessionStorage.getItem("servicehub-auth"); 
    if (raw) { 
      const value = JSON.parse(raw) as PendingAuth; 
      setPending(value); 
      if (value.challengeToken) setChallenge(value.challengeToken); 
    } 
  }, []);
  
  useEffect(() => { 
    if (seconds <= 0) return; 
    const timer = window.setTimeout(() => setSeconds((n) => n - 1), 1000); 
    return () => window.clearTimeout(timer); 
  }, [seconds]);
  
  const code = digits.join("");

  async function submit(value = code) {
    if ((!challenge || !recoveryMode) && value.length !== 6 || challenge && recoveryMode && value.trim().length < 8 || !pending || busy) return;
    setBusy(true); setError("");
    try {
      if (challenge) {
        const result = await verifyTotpLogin({ challengeToken: challenge, code: value });
        finish(result.user);
      } else {
        const result = await verifyOtp({ destination: pending.destination, purpose: pending.purpose, code: value });
        if (result.requiresTotp) {
          if (!result.challengeToken) throw new Error("The sign-in challenge is incomplete. Request a new code and try again.");
          setChallenge(result.challengeToken); setDigits(["", "", "", "", "", ""]); setError(""); inputs.current[0]?.focus();
        }
        else finish(result.user, result.isNewUser);
      }
    } catch (e) { 
      setAttempts((a) => a + 1);
      setDigits(["", "", "", "", "", ""]); 
      inputs.current[0]?.focus(); 
      const errorMsg = e instanceof Error ? e.message : "That code could not be verified. Try again.";
      if (errorMsg.includes("invalid") || errorMsg.includes("incorrect")) {
        setError(messages.auth.codeInvalid.replace("{tries}", String(6 - attempts)));
      } else if (errorMsg.includes("expired")) {
        setError(messages.auth.codeExpired);
      } else if (attempts >= 6) {
        setError(messages.auth.tooManyAttempts);
      } else {
        setError(errorMsg);
      }
    } finally { 
      setBusy(false); 
    }
  }

  function finish(user?: { roles?: string[]; requiresAdminTotpEnrollment?: boolean }, isNewUser?: boolean) {
    sessionStorage.removeItem("servicehub-auth");
    if (user?.requiresAdminTotpEnrollment) router.replace("/admin/security");
    else if (user?.roles?.includes("SUPER_ADMIN") || user?.roles?.includes("ADMIN")) router.replace("/admin");
    else if (user?.roles?.includes("TECHNICIAN")) router.replace("/technician");
    else if (isNewUser || pending?.isNewUser) router.replace("/finish-account");
    else router.replace("/app");
  }

  function update(index: number, raw: string) {
    const value = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[index] = value; setDigits(next); setError("");
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (value && index === 5 && next.every(Boolean)) void submit(next.join(""));
  }

  function paste(event: ClipboardEvent<HTMLInputElement>) { 
    const value = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6); 
    if (!value) return; 
    event.preventDefault(); 
    const next = Array.from({ length: 6 }, (_, i) => value[i] || ""); 
    setDigits(next); 
    setError(""); 
    inputs.current[Math.min(value.length, 5)]?.focus(); 
    if (value.length === 6) void submit(value); 
  }

  function keyDown(index: number, event: KeyboardEvent<HTMLInputElement>) { 
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); 
    if (event.key === "ArrowLeft" && index > 0) inputs.current[index - 1]?.focus(); 
    if (event.key === "ArrowRight" && index < 5) inputs.current[index + 1]?.focus(); 
  }

  async function resend() {
    if (!pending || seconds > 0 || challenge) return;
    setError(""); setSeconds(60);
    try { 
      const original = JSON.parse(sessionStorage.getItem("servicehub-auth") || "{}") as { destination?: string; purpose?: string; displayName?: string; accountType?: string; acceptTerms?: boolean; acceptPrivacy?: boolean };
      await requestOtp({
        destination: pending.destination,
        purpose: pending.purpose,
        ...(original.displayName ? { displayName: original.displayName } : {}),
        ...(original.accountType ? { accountType: original.accountType } : {}),
        ...(original.acceptTerms ? { acceptTerms: true, acceptPrivacy: true } : {})
      });
    } catch (e) { 
      setError(e instanceof Error ? e.message : "We could not send a new code."); 
    }
  }

  if (!pending) return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{messages.auth.checking}</h1>
        <p className="subtle">{messages.auth.useDifferentDetails}</p>
        <Link className="button button-primary auth-submit" href="/sign-in">{messages.auth.backToSignIn}</Link>
      </section>
    </main>
  );

  const maskedPhone = maskPhone(pending.destination);
  const channel = pending.destination.includes("@") ? messages.auth.codeSentEmail : messages.auth.codeSentWhatsApp;

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/">ServiceHub</Link>
        <p className="eyebrow">Account security</p>
        <h1>{challenge ? "Two-step verification" : messages.auth.enterCode}</h1>
        <p className="subtle">
          {challenge
            ? "Enter the code from your authenticator app, or a recovery code."
            : messages.auth.codeSent.replace("{phone}", maskedPhone).replace("{channel}", channel)
          }
        </p>
        
        {challenge && recoveryMode ? (
          <input 
            className="input recovery-input" 
            aria-label="Recovery code" 
            autoComplete="one-time-code" 
            value={recoveryCode} 
            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())} 
            placeholder="Recovery code" 
          />
        ) : (
          <div className="otp-inputs" role="group" aria-label="Six digit verification code">
            {digits.map((digit, index) => (
              <input 
                key={index} 
                ref={(el) => { inputs.current[index] = el; }} 
                className="input otp-input" 
                aria-label={`Digit ${index + 1}`} 
                inputMode="numeric" 
                autoComplete={index === 0 ? "one-time-code" : "off"} 
                maxLength={1} 
                value={digit} 
                onChange={(e) => update(index, e.target.value)} 
                onKeyDown={(e) => keyDown(index, e)} 
                onPaste={paste} 
              />
            ))}
          </div>
        )}
        
        {error && <p className="form-error" role="alert">{error}</p>}
        
        <button 
          className="button button-primary auth-submit" 
          onClick={() => submit(challenge && recoveryMode ? recoveryCode : code)} 
          disabled={(challenge && recoveryMode ? recoveryCode.trim().length < 8 : code.length !== 6) || busy}
        >
          {busy ? messages.auth.checking : messages.auth.verifyAndContinue}
        </button>
        
        {challenge && (
          <button 
            className="link-button auth-submit" 
            onClick={() => { 
              setRecoveryMode(!recoveryMode); 
              setRecoveryCode(""); 
              setDigits(["", "", "", "", "", ""]); 
            }}
          >
            {recoveryMode ? "Use authenticator code" : "Use a recovery code"}
          </button>
        )}
        
        {!challenge && (
          <>
            <p className="resend-row">
              Didn&apos;t get a code? 
              <button 
                className="link-button inline" 
                onClick={resend} 
                disabled={seconds > 0}
              >
                {seconds > 0 ? messages.auth.resendIn.replace("{seconds}", String(seconds)) : messages.auth.resendCode}
              </button>
            </p>
            <button className="link-button back-link" onClick={() => { sessionStorage.removeItem("servicehub-auth"); router.push("/sign-in"); }}>
              {messages.auth.changeNumber}
            </button>
          </>
        )}
        
        <Link className="link-button back-link" href="/sign-in">
          {messages.auth.useDifferentDetails}
        </Link>
      </section>
    </main>
  );
}
