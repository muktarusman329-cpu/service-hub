"use client";

import Link from "next/link";
import { useState } from "react";
import { liveFetch } from "@servicehub/shared/live-api-client";
import { useBookings, useChangeBookingStatus } from "@servicehub/shared/hooks/use-bookings";
import { useJobRequests } from "@servicehub/shared/hooks/use-job-requests";
import { useCatalog } from "@servicehub/shared/hooks/use-catalog";
import { useTechnicianWorkspace, useUpdateTechnicianWorkspace } from "@servicehub/shared/hooks/use-workspaces";
import { useCreateQuote } from "@servicehub/shared/hooks/use-quotes";
import { generateIdempotencyKey } from "@servicehub/shared";
import { Button, Card, LoadingState, FeatureUnavailable } from "@servicehub/ui/components";

function State({ loading, error, retry }: { loading: boolean; error?: Error | null; retry: () => void }) {
  return <LoadingState loading={loading} error={error} retry={retry} loadingMessage="Loading live data…" />;
}

export function TechnicianDashboard() {
  const requests = useJobRequests("technician");
  const bookings = useBookings();
  const profile = useTechnicianWorkspace();
  if (requests.isLoading || bookings.isLoading || profile.isLoading) return <State loading retry={() => { void requests.refetch(); void bookings.refetch(); void profile.refetch(); }} />;
  const error = requests.error || bookings.error || profile.error;
  if (error) return <State loading={false} error={error as Error} retry={() => { void requests.refetch(); void bookings.refetch(); void profile.refetch(); }} />;
  return <div className="stack"><div className="page-heading"><div><h1>Technician workspace</h1><p className="subtle">Live matching requests, bookings, and onboarding status.</p></div><Link className="button button-primary" href="/technician/onboarding">Onboarding</Link></div><div className="grid-2"><Card><h2>Matching requests</h2><p>{requests.data?.length ?? 0} requests available to your profile.</p><Link href="/technician/jobs">View requests</Link></Card><Card><h2>Bookings</h2><p>{bookings.data?.length ?? 0} bookings</p><Link href="/technician/bookings">View bookings</Link></Card></div>{profile.data && <Card><h2>Application status</h2><p>{profile.data.application.status.replaceAll("_", " ")}</p><Link href="/technician/onboarding">View application</Link></Card>}</div>;
}

export function TechnicianOnboardingWorkspace() {
  const query = useTechnicianWorkspace();
  const catalog = useCatalog();
  const update = useUpdateTechnicianWorkspace();
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [bio, setBio] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [experience, setExperience] = useState("0");
  const [error, setError] = useState("");
  if (query.isLoading || catalog.isLoading) return <State loading retry={() => { void query.refetch(); void catalog.refetch(); }} />;
  if (query.isError || catalog.isError) return <State loading={false} error={(query.error || catalog.error) as Error} retry={() => { void query.refetch(); void catalog.refetch(); }} />;
  const profile = (query.data as { profile?: { id: string; status: string; legalName: string | null; displayName: string | null; bio: string | null; cityId: string | null; skills: Array<{ serviceId: string; yearsExperience: number; service: { name: string } }>; areas: Array<{ id: string; name: string }>; portfolio: Array<{ id: string; objectKey: string; caption: string | null }>; kycStatus: string }; checklist?: Array<{ key: string; label: string; complete: boolean; optional?: boolean }>; editable?: boolean } | undefined);
  if (!profile?.profile) return <FeatureUnavailable title="Technician onboarding" />;
  const item = profile.profile;
  const save = async (patch: Record<string, unknown>) => {
    setError("");
    try { await liveFetch("/technician/onboarding", { method: "PATCH", body: patch }); await query.refetch(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save onboarding details."); }
  };
  return <div className="stack"><Card><div className="eyebrow">APPLICATION STATUS</div><h1>{item.status.replaceAll("_", " ")}</h1><p>Progress is read from your submitted profile and verification checklist.</p>{profile.checklist?.map((check) => <p key={check.key}>{check.complete ? "✓" : "○"} {check.label}</p>)}</Card><Card><h2>Profile details</h2><form className="stack" onSubmit={(event) => { event.preventDefault(); void save({ displayName: name || item.displayName, legalName: legalName || item.legalName, bio: bio || item.bio, ...(serviceId ? { skills: [{ serviceId, yearsExperience: Number(experience) }] } : {}), ...(areaId ? { areaIds: [areaId] } : {}) }); }}><label className="field"><span className="field-label">Display name</span><input className="input" value={name || item.displayName || ""} onChange={(e) => setName(e.target.value)} /></label><label className="field"><span className="field-label">Legal name</span><input className="input" value={legalName || item.legalName || ""} onChange={(e) => setLegalName(e.target.value)} /></label><label className="field"><span className="field-label">Bio (20 characters minimum)</span><textarea className="input" minLength={20} value={bio || item.bio || ""} onChange={(e) => setBio(e.target.value)} /></label><label className="field"><span className="field-label">Service</span><select className="input" value={serviceId || item.skills[0]?.serviceId || ""} onChange={(e) => setServiceId(e.target.value)}><option value="">Select service</option>{catalog.data?.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label><label className="field"><span className="field-label">Years of experience</span><input className="input" type="number" min="0" max="60" value={experience} onChange={(e) => setExperience(e.target.value)} /></label><label className="field"><span className="field-label">Service area</span><select className="input" value={areaId || item.areas[0]?.id || ""} onChange={(e) => setAreaId(e.target.value)}><option value="">Select area</option>{catalog.data?.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><Button disabled={update.isPending}>Save profile to API</Button></form>{error && <p className="error-text" role="alert">{error}</p>}<p className="subtle">Identity consent and document upload require the configured secure upload flow; no files are stored as filenames.</p></Card><Card><h2>Skills and areas already saved</h2><p>{item.skills.map((skill) => `${skill.service.name} (${skill.yearsExperience} years)`).join(", ") || "No skills saved"}</p><p>{item.areas.map((area) => area.name).join(", ") || "No areas saved"}</p><Button onClick={async () => { try { await liveFetch("/technician/onboarding/submit", { method: "POST", body: {} }); await query.refetch(); } catch (e) { setError(e instanceof Error ? e.message : "Could not submit application."); } }}>Submit completed application</Button>{error && <p className="error-text" role="alert">{error}</p>}</Card></div>;
}

export function TechnicianBookingList() { const query = useBookings(); if (query.isLoading || query.isError) return <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />; return query.data?.length ? <div className="stack">{query.data.map((booking) => <Card key={booking.id}><h2>{booking.service.name} · {booking.area.name}</h2><p>{booking.nearestLandmark} · {booking.status.replaceAll("_", " ")}</p><Link href={`/technician/bookings/${booking.id}`}>Open booking</Link></Card>)}</div> : <Card><h2>No bookings</h2></Card>; }

export function TechnicianBookingDetail({ id }: { id: string }) { const query = useBookings(); const update = useChangeBookingStatus(); if (query.isLoading || query.isError) return <State loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />; const booking = query.data?.find((item) => item.id === id); if (!booking) return <Card><h2>Booking not found</h2></Card>; const next = booking.status === "ACCEPTED" ? "TECHNICIAN_EN_ROUTE" : booking.status === "TECHNICIAN_EN_ROUTE" ? "IN_PROGRESS" : booking.status === "IN_PROGRESS" ? "COMPLETED_PENDING_CONFIRMATION" : null; return <Card><h1>{booking.service.name}</h1><p>{booking.status.replaceAll("_", " ")}</p>{next && <Button onClick={() => update.mutate({ id, data: { status: next, idempotencyKey: generateIdempotencyKey() } })}>Update status to {next.replaceAll("_", " ")}</Button>}{update.isError && <p role="alert">{update.error.message}</p>}</Card>; }

export function TechnicianRequestDetail({ id }: { id: string }) { const requests = useJobRequests("technician"); const createQuote = useCreateQuote(); const [price, setPrice] = useState(""); const [message, setMessage] = useState(""); if (requests.isLoading || requests.isError) return <State loading={requests.isLoading} error={requests.error} retry={() => void requests.refetch()} />; const request = requests.data?.find((item) => item.id === id); if (!request) return <Card><h2>Request not found in your feed</h2></Card>; return <Card><h1>{request.service.name}</h1><p>{request.area.name} · {request.description}</p><form className="stack" onSubmit={(event) => { event.preventDefault(); createQuote.mutate({ requestId: id, data: { priceKobo: Math.round(Number(price) * 100), message, clientIdempotencyKey: generateIdempotencyKey() } }); }}><label className="field"><span>Total price (₦)</span><input className="input" type="number" min="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label><label className="field"><span>Message</span><textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} /></label><Button disabled={createQuote.isPending}>Send real quote</Button></form>{createQuote.isError && <p role="alert">{createQuote.error.message}</p>}</Card>; }

export function TechnicianMyQuotes() { return <FeatureUnavailable title="Quote history" />; }
export function TechnicianWallet() { return <FeatureUnavailable title="Wallet and payouts" />; }
export function TechnicianEarnings() { return <FeatureUnavailable title="Earnings and reviews" />; }
export function TechnicianSettings() { return <FeatureUnavailable title="Technician notification settings" />; }
export function TechnicianSchedule() { return <FeatureUnavailable title="Availability management" />; }
