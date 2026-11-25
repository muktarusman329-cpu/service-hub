"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";
import { messages } from "@servicehub/shared/messages/en";
import { House, Wrench, ShoppingBag, Truck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type Service = { id: string; name: string };
type Category = { name: string; services: Service[] };
const choices = [
  ["CUSTOMER", House, messages.auth.welcomeServices],
  ["TECHNICIAN", Wrench, messages.auth.welcomeTechnician],
  ["MARKETPLACE", ShoppingBag, messages.auth.welcomeMarket],
  ["DELIVERY", Truck, messages.auth.welcomeDelivery],
] as const;
export default function WelcomePage() {
  const router = useRouter();
  const [intents, setIntents] = useState<string[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [devSkipped, setDevSkipped] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setDevSkipped(sessionStorage.getItem("servicehub-dev-verification") === "skipped");
    authFetch<Category[]>("/catalog/minna/categories").then(rows => setServices(rows.flatMap(row => row.services || []))).catch(() => setError(messages.auth.welcomeRetry)).finally(() => setLoading(false));
  }, []);
  async function save(skip = false) {
    setError("");
    if (!skip && intents.length === 0) { setError(messages.auth.chooseOne); return; }
    setBusy(true);
    try {
      const result = await authFetch<{ technicianInterest: boolean }>("/auth/profile-preferences", { method: "POST", body: JSON.stringify({ intents: skip ? [] : intents, serviceIds: skip ? [] : selected, completed: true, role: "SUPER_ADMIN", accountType: "TECHNICIAN" }) });
      sessionStorage.removeItem("servicehub-dev-verification");
      sessionStorage.removeItem("servicehub-auth");
      router.replace(result.technicianInterest ? "/technician/onboarding" : "/app");
    } catch (e) { setError(e instanceof Error ? e.message : messages.auth.networkRetry); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card" style={{ maxWidth: "540px" }}>
    <BrandLogo className="auth-brand" /><h1>{messages.auth.welcomeTitle}</h1>
    {devSkipped && <p className="notice notice-warning" role="status">{messages.auth.devVerificationSkipped}</p>}
    <div className="stack" role="group" aria-label={messages.auth.welcomeTitle}>
      {choices.map(([key, Icon, label]) => <label key={key} className="choice-card"><input type="checkbox" checked={intents.includes(key)} onChange={e => setIntents(current => e.target.checked ? [...current, key] : current.filter(value => value !== key))} /><Icon aria-hidden="true" size={20} />{label}</label>)}
    </div>
    <h2 className="section-title">{messages.auth.welcomeInterests} <span className="subtle">({messages.auth.optional})</span></h2>
    {loading ? <p className="subtle" aria-live="polite">{messages.loading}</p> : services.length ? <div className="chip-list">{services.map(service => <button key={service.id} type="button" className={`chip ${selected.includes(service.id) ? "chip-selected" : ""}`} onClick={() => setSelected(current => current.includes(service.id) ? current.filter(id => id !== service.id) : [...current, service.id])}>{service.name}</button>)}</div> : <button className="link-button" onClick={() => { setLoading(true); setError(""); authFetch<Category[]>("/catalog/minna/categories").then(rows => setServices(rows.flatMap(row => row.services || []))).catch(() => setError(messages.auth.welcomeRetry)).finally(() => setLoading(false)); }}>{messages.auth.retry}</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary auth-submit" onClick={() => void save()} disabled={busy}>{busy ? messages.auth.pleaseWait : messages.auth.saveAndContinue}</button>
    <button className="link-button auth-submit" onClick={() => void save(true)} disabled={busy}>{messages.auth.skipForNow}</button>
    <button className="link-button back-link" onClick={() => router.back()}>{messages.auth.back}</button>
  </section></main>;
}
