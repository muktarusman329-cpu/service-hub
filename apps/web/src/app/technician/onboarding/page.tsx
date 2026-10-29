"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@servicehub/ui/components";
import { ProductShell } from "@/components/product-shell";
import { authFetch } from "@/lib/auth-client";

type Option = { id: string; name: string };
type Onboarding = { profile: { status: string; legalName?: string; displayName?: string; bio?: string; cityId?: string; profilePhotoKey?: string; portfolio: { objectKey: string; caption?: string }[]; skills: { serviceId: string; yearsExperience: number }[]; areas: { id: string; name: string }[]; weeklyAvailability?: Record<string, boolean>; kycStatus: string }; checklist: { key: string; label: string; complete: boolean; optional?: boolean }[]; progress: number };

export default function TechnicianOnboardingPage() {
  const [data, setData] = useState<Onboarding | null>(null);
  const [catalog, setCatalog] = useState<{ city: { id: string }; items: { services: Option[] }[] } | null>(null);
  const [areas, setAreas] = useState<Option[]>([]);
  const [message, setMessage] = useState("Loading your checklist…");
  const [busy, setBusy] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  const refresh = useCallback(async () => {
    try { const [profile, cats, areaList] = await Promise.all([authFetch("/technician/onboarding"), fetch(`${api}/catalog/minna/categories`).then(r => r.json()), fetch(`${api}/catalog/minna/areas`).then(r => r.json())]); setData(profile); setCatalog(cats); setAreas(areaList); setMessage("Your progress is saved as you go."); }
    catch { setMessage("Sign in with your technician account to continue. Your checklist will be here when you return."); }
  }, [api]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function save(form: FormData) {
    setBusy(true); setMessage("Saving…");
    try {
      const serviceIds = form.getAll("service") as string[]; const areaIds = form.getAll("area") as string[];
      const payload = { legalName: String(form.get("legalName") || ""), displayName: String(form.get("displayName") || ""), bio: String(form.get("bio") || ""), cityId: catalog?.city.id || data?.profile.cityId, skills: serviceIds.map(serviceId => ({ serviceId, yearsExperience: Number(form.get(`years-${serviceId}`) || 0) })), areaIds, weeklyAvailability: Object.fromEntries(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => [day, form.getAll("day").includes(day)])), guarantorName: String(form.get("guarantorName") || "") || undefined, guarantorPhone: String(form.get("guarantorPhone") || "") || undefined, guarantorRelationship: String(form.get("guarantorRelationship") || "") || undefined, guarantorAgreed: form.get("guarantorAgreed") === "on" };
      const result = await authFetch("/technician/onboarding", { method: "PATCH", body: JSON.stringify(payload) }); setData(result); setMessage("Saved. You can leave and continue later.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save. Please try again."); }
    finally { setBusy(false); }
  }
  async function upload(file: File, kind: string) {
    const signed = await authFetch("/technician/onboarding/uploads/sign", { method: "POST", body: JSON.stringify({ kind, contentType: file.type, size: file.size }) });
    const put = await fetch(signed.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file }); if (!put.ok) throw new Error("Upload did not finish. Please try again."); return signed.objectKey as string;
  }
  async function uploadProfile(file: File, kind: "PROFILE_PHOTO" | "PORTFOLIO") {
    setBusy(true); setMessage("Uploading photo…");
    try { const objectKey = await upload(file, kind); const current = data?.profile.portfolio || []; await authFetch("/technician/onboarding", { method: "PATCH", body: JSON.stringify(kind === "PROFILE_PHOTO" ? { profilePhotoKey: objectKey } : { portfolio: [...current, { objectKey }] }) }); await refresh(); setMessage("Photo uploaded and saved."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed. Please retry."); } finally { setBusy(false); }
  }
  async function submitKyc(form: FormData) {
    setBusy(true);
    try { if (form.get("kycConsent") !== "on") throw new Error("Please accept the identity-check consent to continue."); await authFetch("/technician/onboarding/kyc/consent", { method: "POST", body: JSON.stringify({ accepted: true }) }); const idPhoto = form.get("idPhoto") as File; const selfie = form.get("selfie") as File; const [idPhotoKey, selfieKey] = await Promise.all([upload(idPhoto, "ID_PHOTO"), upload(selfie, "SELFIE")]); await authFetch("/technician/onboarding/kyc/submit", { method: "POST", body: JSON.stringify({ idType: form.get("idType"), idNumber: form.get("idNumber"), idPhotoKey, selfieKey }) }); await refresh(); setMessage("Identity documents submitted for manual review."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed. Check your connection and retry."); } finally { setBusy(false); }
  }
  async function submitProfile() { setBusy(true); try { await authFetch("/technician/onboarding/submit", { method: "POST" }); await refresh(); setMessage("Application submitted. Our team will review it and update you here."); } catch (e) { setMessage(e instanceof Error ? e.message : "Complete the checklist before submitting."); } finally { setBusy(false); } }
  const services = catalog?.items.flatMap(x => x.services) || [];
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">Technician setup · Minna</div><h1>Get your profile ready</h1><p className="subtle">Complete these steps to apply for a verified listing.</p></div></div>
    <div className="grid-2 onboarding-layout"><div className="stack">
      <Card><div className="section-head"><h2>Your checklist</h2><span>{Math.round((data?.progress || 0) * 100)}%</span></div><div className="checklist">{data?.checklist.map(x => <div className="list-row" key={x.key}><span>{x.label}</span><span className={x.complete ? "status-success" : "status-muted"}>{x.complete ? "Done" : x.optional ? "Optional" : "To do"}</span></div>)}</div><p className="subtle" role="status">{message}</p></Card>
      <Card><h2>1. Profile and services</h2><form action={save} className="stack"><label>Full name<input name="legalName" required minLength={2} defaultValue={data?.profile.legalName || ""}/></label><label>Name customers will see<input name="displayName" required minLength={2} defaultValue={data?.profile.displayName || ""}/></label><label>Short introduction<textarea name="bio" required minLength={20} rows={3} defaultValue={data?.profile.bio || ""}/></label><label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={e=>e.target.files?.[0]&&void uploadProfile(e.target.files[0],"PROFILE_PHOTO")}/></label><p className="subtle">{data?.profile.profilePhotoKey?"Profile photo saved.":"Add a clear photo of yourself."}</p><label>Services you offer</label>{services.map(s=><label className="choice-row" key={s.id}><input type="checkbox" name="service" value={s.id} defaultChecked={data?.profile.skills.some(x=>x.serviceId===s.id)}/>{s.name}<input aria-label={`Years experience for ${s.name}`} name={`years-${s.id}`} type="number" min="0" max="60" placeholder="Years" className="small-number"/></label>)}<label>Areas you cover</label><div className="area-grid">{areas.map(a=><label className="choice-row" key={a.id}><input type="checkbox" name="area" value={a.id} defaultChecked={data?.profile.areas.some(x=>x.id===a.id)}/>{a.name}</label>)}</div><label>Days available</label><div className="area-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><label className="choice-row" key={d}><input type="checkbox" name="day" value={d} defaultChecked={data?.profile.weeklyAvailability?.[d]}/>{d}</label>)}</div><Button type="submit" disabled={busy}>Save profile</Button></form></Card>
      <Card><h2>Work photos</h2><p className="subtle">Add clear photos of work you have done.</p><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>e.target.files?.[0]&&void uploadProfile(e.target.files[0],"PORTFOLIO")}/><p>{data?.profile.portfolio.length||0} photos saved.</p></Card>
      <Card><h2>2. Identity check</h2><p className="subtle">We use these documents only to review your application. Images: JPG, PNG or WebP, up to 8 MB each.</p><form action={submitKyc} className="stack"><label>ID type<select name="idType"><option value="NIN">NIN</option><option value="VOTER_CARD">Voter card</option><option value="DRIVERS_LICENCE">Driver’s licence</option><option value="PASSPORT">Passport</option></select></label><label>ID number<input name="idNumber" required minLength={4}/></label><label>ID photo<input name="idPhoto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required/></label><label>Selfie<input name="selfie" type="file" accept="image/jpeg,image/png,image/webp" capture="user" required/></label><label className="choice-row"><input type="checkbox" name="kycConsent" required/>I agree to the identity check described in the <a href="/privacy">privacy notice</a>.</label><Button type="submit" disabled={busy}>Submit identity documents</Button></form></Card>
      <Card><h2>3. Optional guarantor</h2><p className="subtle">Minna does not require a guarantor by default. If you add one, confirm they agreed to be contacted.</p><form action={save} className="stack"><label>Guarantor name<input name="guarantorName" defaultValue=""/></label><label>Phone number<input name="guarantorPhone" type="tel" placeholder="080…"/></label><label>Relationship<input name="guarantorRelationship" placeholder="For example, family member"/></label><label className="choice-row"><input type="checkbox" name="guarantorAgreed"/>They agreed to be contacted</label><Button type="submit" disabled={busy}>Save guarantor details</Button></form></Card>
      <Card><h2>4. Apply for review</h2><p className="subtle">Your listing will stay private until our team approves your application.</p><Button onClick={submitProfile} disabled={busy || data?.profile.status === "SUBMITTED"}>Submit application</Button></Card>
    </div><Card><h2>Application status</h2><p className="status-chip">{data?.profile.status || "Sign in required"}</p><p className="subtle">After you submit, our local team checks your profile and identity documents. We’ll let you know if anything needs fixing.</p><div className="section-head"><h3>Tips for a strong profile</h3></div><ul><li>Choose only the services you can provide.</li><li>Add all areas where you can respond.</li><li>Use clear, recent photos of your work.</li></ul></Card></div>
  </ProductShell>;
}
