"use client";

import Link from "next/link";
import { useState } from "react";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { categories } from "@servicehub/shared/fixtures/categories";
import { useBookings, useChangeBookingStatus } from "@servicehub/shared/hooks/use-bookings";
import { useJobRequests } from "@servicehub/shared/hooks/use-job-requests";
import { useTechnicianWorkspace, useUpdateTechnicianWorkspace } from "@servicehub/shared/hooks/use-workspaces";
import { useRequestPayout, useWallet, useWalletTransactions } from "@servicehub/shared/hooks/use-wallet";
import { useNotifications, useReviews } from "@servicehub/shared/hooks/use-customer-tools";
import { useCreateQuote, useQuotes, useQuotesForRequests, useUpdateQuote, useWithdrawQuote } from "@servicehub/shared/hooks/use-quotes";
import type { TechnicianWorkspaceAction } from "@servicehub/shared/api-client";
import { Badge, Button, Card } from "@servicehub/ui/components";
import { messages } from "@servicehub/shared/messages/en";

const money = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
const makeKey = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;

function QueryState({ loading, error, retry }: { loading: boolean; error?: Error | null; retry: () => void }) {
  if (loading) return <Card><p role="status">{messages.loading}</p><span className="skeleton" /><span className="skeleton short" /></Card>;
  if (error) return <Card><p className="error-text" role="alert">{error.message}</p><Button tone="secondary" onClick={retry}>{messages.retry}</Button></Card>;
  return null;
}

export function TechnicianDashboard() {
  const workspace = useTechnicianWorkspace();
  const requests = useJobRequests();
  const bookings = useBookings();
  const wallet = useWallet();
  const notes = useNotifications();
  if (workspace.isLoading || requests.isLoading || bookings.isLoading || wallet.isLoading || notes.isLoading) return <QueryState loading retry={() => { void workspace.refetch(); void requests.refetch(); void bookings.refetch(); void wallet.refetch(); void notes.refetch(); }} />;
  const error = workspace.error || requests.error || bookings.error || wallet.error || notes.error;
  if (error) return <QueryState loading={false} error={error as Error} retry={() => { void workspace.refetch(); void requests.refetch(); void bookings.refetch(); void wallet.refetch(); void notes.refetch(); }} />;
  if (!workspace.data || !requests.data || !bookings.data || !wallet.data || !notes.data) return <Card><p className="error-text" role="alert">Dashboard data is unavailable.</p><Button tone="secondary" onClick={() => { void workspace.refetch(); void requests.refetch(); void bookings.refetch(); void wallet.refetch(); void notes.refetch(); }}>Try again</Button></Card>;
  const openRequests = (requests.data ?? []).filter((item) => !item.booking && ["OPEN", "DIRECTED", "QUOTED"].includes(item.status));
  const activeBookings = (bookings.data ?? []).filter((item) => ["ACCEPTED", "TECHNICIAN_EN_ROUTE", "IN_PROGRESS"].includes(item.status));
  return <div className="stack">
    <div className="page-heading"><div><div className="eyebrow">MINNA · TECHNICIAN WORKSPACE</div><h1>{messages.technicianApp.dashboard}</h1><p className="subtle">Your work, bookings and earnings at a glance.</p></div><Link className="button button-primary" href="/technician/onboarding">Update onboarding</Link></div>
    <div className="grid-4">
      <Card><span className="metric-label">Available balance</span><strong className="metric-value">{money(wallet.data?.balanceKobo ?? 0)}</strong><Link href="/technician/wallet" className="text-link">Open wallet</Link></Card>
      <Card><span className="metric-label">Matching requests</span><strong className="metric-value">{openRequests.length}</strong><Link href="/technician/jobs" className="text-link">View requests</Link></Card>
      <Card><span className="metric-label">Active bookings</span><strong className="metric-value">{activeBookings.length}</strong><Link href="/technician/bookings" className="text-link">Track jobs</Link></Card>
      <Card><span className="metric-label">Application</span><strong className="metric-value">{workspace.data?.application.status.replaceAll("_", " ")}</strong><Link href="/technician/onboarding" className="text-link">View status</Link></Card>
    </div>
    <div className="grid-2">
      <Card><div className="section-head"><h2>Requests to review</h2><Link href="/technician/jobs" className="text-link">See all</Link></div>{openRequests.slice(0, 3).map((request) => <div className="list-row tech-request-row" key={request.id}><div><strong>{request.service.name}</strong><div className="subtle">{request.area.name} · {request.nearestLandmark}</div></div><Badge tone="info">{request.urgency}</Badge></div>)}{!openRequests.length && <p className="subtle">{messages.technicianApp.noRequests}</p>}</Card>
      <Card><h2>Performance snapshot</h2><div className="list"><div className="list-row"><span>Rating</span><strong>4.7 / 5 · 42 reviews</strong></div><div className="list-row"><span>Jobs completed</span><strong>42</strong></div><div className="list-row"><span>Cash commission due</span><strong>{money(workspace.data?.cashCommissionOwedKobo ?? 0)}</strong></div></div><Link className="button button-secondary" href="/technician/earnings">View earnings</Link></Card>
    </div>
  </div>;
}

export function TechnicianOnboardingWorkspace() {
  const query = useTechnicianWorkspace();
  const update = useUpdateTechnicianWorkspace();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [skill, setSkill] = useState("");
  const [area, setArea] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [kycFileName, setKycFileName] = useState("");
  const [consent, setConsent] = useState(false);
  const [guarantor, setGuarantor] = useState("");
  if (query.isLoading || query.isError) return <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  const application = query.data?.application;
  if (!application) return <Card><p className="error-text" role="alert">Your onboarding profile could not be found.</p><Button tone="secondary" onClick={() => void query.refetch()}>Try again</Button></Card>;
  const steps = [messages.technicianApp.profile, messages.technicianApp.skills, messages.technicianApp.serviceAreas, messages.technicianApp.availability, messages.technicianApp.portfolio, messages.technicianApp.identity, messages.technicianApp.review];
  const statusMessages: Record<string, string> = {
    DRAFT: "Finish your application and submit it for review.",
    SUBMITTED: messages.technicianApp.submitted,
    UNDER_REVIEW: messages.technicianApp.underReview,
    CHANGES_REQUESTED: `${messages.technicianApp.changesRequested}: ${application.reviewNote ?? "Update your details and submit again."}`,
    APPROVED: messages.technicianApp.approved,
    REJECTED: `${messages.technicianApp.rejected}: ${application.reviewNote ?? "Contact support if you need help."}`,
    SUSPENDED: messages.technicianApp.suspended,
  };
  const selectable = application.status === "DRAFT" || application.status === "CHANGES_REQUESTED" || application.status === "REJECTED";
  const save = (patch: Extract<TechnicianWorkspaceAction, { type: "save-application" }>["patch"]) =>
    update.mutate({ type: "save-application", patch });
  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return <div className="stack">
    <Card><div className="eyebrow">APPLICATION STATUS</div><h2>{application.status.replaceAll("_", " ")}</h2><p>{statusMessages[application.status]}</p>{application.status === "APPROVED" && <Link className="button" href="/technician">Open technician dashboard</Link>}</Card>
    <Card><div className="section-head"><div><div className="eyebrow">{messages.technicianApp.stepOf.replace("{step}", String(step)).replace("{total}", String(steps.length))}</div><h2>{steps[step - 1]}</h2></div><Badge tone={selectable ? "info" : "warning"}>{selectable ? "Editable demo" : application.status.replaceAll("_", " ")}</Badge></div>
      <div className="progress-track"><span style={{ width: `${(step / steps.length) * 100}%` }} /></div>
      {!selectable && <p className="subtle">This submitted application is read-only. Status changes can be tested from the admin technician review screen.</p>}
      {step === 1 && <div className="stack"><label className="field"><span className="field-label">Public display name</span><input className="input" value={displayName || application.displayName} disabled={!selectable} onChange={(event) => setDisplayName(event.target.value)} /></label><label className="field"><span className="field-label">Short profile</span><textarea className="input" rows={3} value={bio || application.bio} disabled={!selectable} onChange={(event) => setBio(event.target.value)} /></label></div>}
      {step === 2 && <div className="stack"><label className="field"><span className="field-label">Primary skill</span><select className="input" value={skill || application.skills[0] || ""} disabled={!selectable} onChange={(event) => setSkill(event.target.value)}>{categories.flatMap((item) => item.services).map((service) => <option key={service.id}>{service.name}</option>)}</select></label><p className="subtle">Selected skills: {[...new Set([...application.skills, ...(skill ? [skill] : [])])].join(", ")}</p></div>}
      {step === 3 && <div className="stack"><label className="field"><span className="field-label">Main service area</span><select className="input" value={area || application.areas[0] || ""} disabled={!selectable} onChange={(event) => setArea(event.target.value)}>{minnaAreas.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><p className="subtle">Service areas use neighbourhood-level labels only.</p></div>}
      {step === 4 && <div className="stack"><p className="subtle">Choose the days you usually accept work.</p><div className="check-list">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <label className="check-row" key={day}><input type="checkbox" checked={availability.length ? availability.includes(day) : application.availability.includes(day)} disabled={!selectable} onChange={() => setAvailability((current) => toggle(current.length ? current : application.availability, day))} />{day}</label>)}</div></div>}
      {step === 5 && <div className="stack"><label className="field"><span className="field-label">Portfolio sample (optional)</span><input className="input" value={portfolio || application.portfolio[0] || ""} disabled={!selectable} onChange={(event) => setPortfolio(event.target.value)} placeholder="Describe a completed job" /></label><label className="field"><span className="field-label">Add portfolio photos</span><input className="input" type="file" accept="image/*" multiple disabled={!selectable} onChange={(event) => setPortfolio(Array.from(event.target.files ?? []).map((file) => file.name).join(", "))} /><span className="field-hint">Photos are names only in this mock browser flow.</span></label></div>}
      {step === 6 && <div className="stack"><label className="field"><span className="field-label">Identity document capture (camera or file)</span><input className="input" type="file" accept="image/*,.pdf" capture="environment" disabled={!selectable} onChange={(event) => setKycFileName(event.target.files?.[0]?.name ?? "")} /></label>{application.kycDocumentName && !kycFileName && <span className="field-hint">Current demo document: {application.kycDocumentName}</span>}<label className="check-row"><input type="checkbox" checked={consent || application.kycConsent} disabled={!selectable} onChange={(event) => setConsent(event.target.checked)} />I consent to identity verification for technician onboarding.</label><label className="field"><span className="field-label">Guarantor (optional)</span><input className="input" value={guarantor || application.guarantorName || ""} disabled={!selectable} onChange={(event) => setGuarantor(event.target.value)} placeholder="Guarantor name" /></label></div>}
      {step === 7 && <div className="stack"><p className="subtle">Review your information before sending it to the demo review queue.</p><div className="list"><div><strong>{displayName || application.displayName}</strong><div className="subtle">{bio || application.bio}</div></div><div><strong>Skills</strong><div className="subtle">{[...new Set([...application.skills, ...(skill ? [skill] : [])])].join(", ")}</div></div><div><strong>Areas</strong><div className="subtle">{[...new Set([...application.areas, ...(area ? [area] : [])])].join(", ")}</div></div><div><strong>Identity consent</strong><div className="subtle">{consent || application.kycConsent ? "Given" : "Required"}</div></div></div></div>}
      {update.isError && <p className="error-text" role="alert">{update.error.message}</p>}
      {update.isSuccess && <p className="form-success" role="status">Saved to the mock application.</p>}
      <div className="request-form-actions"><Button tone="secondary" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>Back</Button>{step < 7 ? <Button onClick={() => { if (step === 1) save({ displayName: displayName || application.displayName, bio: bio || application.bio }); if (step === 2 && skill) save({ skills: [...new Set([...application.skills, skill])] }); if (step === 3 && area) save({ areas: [...new Set([...application.areas, area])] }); if (step === 4 && availability.length) save({ availability }); if (step === 5 && portfolio) save({ portfolio: [portfolio] }); if (step === 6) save({ kycDocumentName: kycFileName || application.kycDocumentName, kycConsent: consent || application.kycConsent, guarantorName: guarantor || application.guarantorName }); setStep((value) => value + 1); }}>{messages.next}</Button> : selectable ? <Button disabled={update.isPending} onClick={() => update.mutate({ type: "submit-application" })}>{update.isPending ? "Submitting…" : messages.technicianApp.submitApplication}</Button> : <Button tone="secondary" onClick={() => setStep(1)}>Review submitted details</Button>}</div>
    </Card>
  </div>;
}

export function TechnicianBookingList() {
  const query = useBookings();
  if (query.isLoading || query.isError) return <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <Card><p className="error-text" role="alert">Schedule data is unavailable.</p><Button tone="secondary" onClick={() => void query.refetch()}>Try again</Button></Card>;
  const rows = query.data ?? [];
  return rows.length ? <div className="stack">{rows.map((booking) => <Card key={booking.id}><div className="section-head"><div><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.nearestLandmark}</h2></div><Badge>{booking.status.replaceAll("_", " ")}</Badge></div><p>{booking.technician.displayName} · {money(booking.priceKobo)}</p><Link className="button button-secondary" href={`/technician/bookings/${booking.id}`}>Open booking</Link></Card>)}</div> : <Card><h2>{messages.technicianApp.noBookings}</h2><p className="subtle">Accepted customer bookings will appear here.</p><Link className="button" href="/technician/jobs">View matching requests</Link></Card>;
}

export function TechnicianBookingDetail({ id }: { id: string }) {
  const query = useBookings();
  const update = useChangeBookingStatus();
  const [reason, setReason] = useState("");
  if (query.isLoading || query.isError) return <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  const booking = query.data?.find((item) => item.id === id);
  if (!booking) return <Card><h2>Booking not found</h2><Link className="button" href="/technician/bookings">Back to bookings</Link></Card>;
  const transitions: Partial<Record<typeof booking.status, { status: "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION"; label: string }>> = {
    ACCEPTED: { status: "TECHNICIAN_EN_ROUTE", label: "I am on my way" },
    TECHNICIAN_EN_ROUTE: { status: "IN_PROGRESS", label: "Start the job" },
    IN_PROGRESS: { status: "COMPLETED_PENDING_CONFIRMATION", label: "Mark job done" },
  };
  const next = transitions[booking.status];
  return <div className="stack"><Card><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.nearestLandmark}</h2><p>{booking.status.replaceAll("_", " ")} · {money(booking.priceKobo)}</p><ol className="booking-timeline">{booking.history.map((entry) => <li key={`${entry.toStatus}-${entry.createdAt}`}><span className="history-dot" /><div><strong>{entry.toStatus.replaceAll("_", " ")}</strong><span>{new Date(entry.createdAt).toLocaleString("en-NG")}</span></div></li>)}</ol><Link className="button button-secondary" href="/app/messages/conversation-active">Open customer chat</Link></Card><Card><h2>Update booking</h2>{next ? <><label className="field"><span className="field-label">Optional update for the customer</span><input className="input" value={reason} onChange={(event) => setReason(event.target.value)} /></label><Button disabled={update.isPending} onClick={() => update.mutate({ id, data: { status: next.status, reason: reason.trim() || undefined, idempotencyKey: makeKey() } })}>{next.label}</Button></> : <p className="subtle">There are no technician status actions for this booking step.</p>}{update.isError && <p className="error-text" role="alert">{update.error.message}</p>}</Card></div>;
}

export function TechnicianSchedule() {
  const query = useTechnicianWorkspace();
  const update = useUpdateTechnicianWorkspace();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("Time off");
  if (query.isLoading || query.isError) return <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <Card><p className="error-text" role="alert">Schedule data is unavailable.</p><Button tone="secondary" onClick={() => void query.refetch()}>Try again</Button></Card>;
  return <div className="stack"><Card><h2>Weekly availability</h2><p className="subtle">Current working days: {query.data.application.availability.join(", ") || "Not set"}. This is a neighbourhood service schedule, not live location tracking.</p><Link className="button button-secondary" href="/technician/onboarding">Edit availability</Link></Card><Card><h2>Add time off</h2><form className="stack" onSubmit={(event) => { event.preventDefault(); update.mutate({ type: "add-time-off", block: { startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), reason } }, { onSuccess: () => { setStartAt(""); setEndAt(""); } }); }}><label className="field"><span className="field-label">Start</span><input className="input" required type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label><label className="field"><span className="field-label">End</span><input className="input" required type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label><label className="field"><span className="field-label">Reason</span><input className="input" value={reason} onChange={(event) => setReason(event.target.value)} /></label><Button type="submit">Block time</Button></form>{update.isError && <p className="error-text" role="alert">{update.error.message}</p>}</Card>{query.data.timeOff.map((block) => <Card key={block.id}><div className="list-row"><div><strong>{new Date(block.startAt).toLocaleString("en-NG")}</strong><div className="subtle">Until {new Date(block.endAt).toLocaleString("en-NG")} · {block.reason}</div></div><Button tone="secondary" onClick={() => update.mutate({ type: "remove-time-off", id: block.id })}>Remove block</Button></div></Card>)}</div>;
}

export function TechnicianWallet() {
  const wallet = useWallet();
  const transactions = useWalletTransactions();
  const workspace = useTechnicianWorkspace();
  const updateWorkspace = useUpdateTechnicianWorkspace();
  const payout = useRequestPayout();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [topUp, setTopUp] = useState("");
  if (wallet.isLoading || transactions.isLoading || workspace.isLoading) return <QueryState loading retry={() => { void wallet.refetch(); void transactions.refetch(); void workspace.refetch(); }} />;
  const error = wallet.error || transactions.error || workspace.error;
  if (error) return <QueryState loading={false} error={error as Error} retry={() => { void wallet.refetch(); void transactions.refetch(); void workspace.refetch(); }} />;
  if (!wallet.data || !transactions.data || !workspace.data) return <Card><p className="error-text" role="alert">Wallet data is unavailable.</p><Button tone="secondary" onClick={() => { void wallet.refetch(); void transactions.refetch(); void workspace.refetch(); }}>Try again</Button></Card>;
  const banks = workspace.data.bankAccounts;
  return <div className="stack"><div className="grid-2"><Card><span className="metric-label">Available wallet balance</span><strong className="metric-value">{money(wallet.data.balanceKobo)}</strong><p className="subtle">Cash commission owed: {money(workspace.data.cashCommissionOwedKobo)}</p><form className="form-inline" onSubmit={(event) => { event.preventDefault(); updateWorkspace.mutate({ type: "top-up-wallet", amountKobo: Math.round(Number(topUp) * 100) }, { onSuccess: () => setTopUp("") }); }}><input className="input" type="number" min="1" value={topUp} onChange={(event) => setTopUp(event.target.value)} placeholder="Top-up amount (₦)" aria-label="Top-up amount in naira" /><Button type="submit" disabled={!topUp}>Demo top-up</Button></form>{updateWorkspace.isError && <p className="error-text" role="alert">{updateWorkspace.error.message}</p>}</Card><Card><h2>Request a payout</h2>{banks.length ? <form className="stack" onSubmit={(event) => { event.preventDefault(); payout.mutate({ bankAccountId: banks[0]!.id, amountKobo: Math.round(Number(amount) * 100) }, { onSuccess: () => setAmount("") }); }}><p className="subtle">{banks[0]?.bankName} · {banks[0]?.maskedNumber}</p><label className="field"><span className="field-label">Amount (₦)</span><input className="input" type="number" min="1" max={wallet.data.balanceKobo / 100} required value={amount} onChange={(event) => setAmount(event.target.value)} /></label><Button type="submit" disabled={payout.isPending}>{payout.isPending ? "Requesting…" : messages.technicianApp.payout}</Button></form> : <p className="subtle">Add a bank account below to request a payout.</p>}{payout.isError && <p className="error-text" role="alert">{payout.error.message}</p>}{payout.isSuccess && <p className="form-success" role="status">Payout requested. It appears in your payout history.</p>}</Card></div><Card><h2>Bank accounts</h2><form className="form-grid-2" onSubmit={(event) => { event.preventDefault(); updateWorkspace.mutate({ type: "add-bank-account", bankName, accountName, accountNumber }, { onSuccess: () => { setBankName(""); setAccountName(""); setAccountNumber(""); } }); }}><label className="field"><span className="field-label">Bank name</span><input className="input" required value={bankName} onChange={(event) => setBankName(event.target.value)} /></label><label className="field"><span className="field-label">Account name</span><input className="input" required value={accountName} onChange={(event) => setAccountName(event.target.value)} /></label><label className="field"><span className="field-label">Account number</span><input className="input" inputMode="numeric" pattern="[0-9]{10}" required value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} /></label><Button type="submit">Add bank account</Button></form>{workspace.data.bankAccounts.map((bank) => <p className="subtle" key={bank.id}>{bank.bankName} · {bank.accountName} · {bank.maskedNumber}</p>)}{updateWorkspace.isError && <p className="error-text" role="alert">{updateWorkspace.error.message}</p>}</Card><Card><h2>Wallet ledger</h2>{transactions.data.length ? <div className="list">{transactions.data.map((item) => <div className="list-row" key={item.id}><div><strong>{item.description}</strong><div className="subtle">{new Date(item.createdAt).toLocaleString("en-NG")}</div></div><span>{item.type === "CREDIT" ? "+" : "−"}{money(item.amountKobo)}</span></div>)}</div> : <p className="subtle">{messages.technicianApp.noTransactions}</p>}<h3>Payout history</h3>{workspace.data.payouts.length ? workspace.data.payouts.map((item) => <div className="list-row" key={item.id}><span>{new Date(item.createdAt).toLocaleDateString("en-NG")}</span><strong>{money(item.amountKobo)} · {item.status}</strong></div>) : <p className="subtle">No payouts requested yet.</p>}</Card></div>;
}

export function TechnicianEarnings() {
  const wallet = useWallet();
  const transactions = useWalletTransactions();
  const reviews = useReviews();
  if (wallet.isLoading || transactions.isLoading || reviews.isLoading) return <QueryState loading retry={() => { void wallet.refetch(); void transactions.refetch(); void reviews.refetch(); }} />;
  const error = wallet.error || transactions.error || reviews.error;
  if (error) return <QueryState loading={false} error={error as Error} retry={() => { void wallet.refetch(); void transactions.refetch(); void reviews.refetch(); }} />;
  if (!wallet.data || !transactions.data || !reviews.data) return <Card><p className="error-text" role="alert">Earnings data is unavailable.</p><Button tone="secondary" onClick={() => { void wallet.refetch(); void transactions.refetch(); void reviews.refetch(); }}>Try again</Button></Card>;
  const credits = transactions.data.filter((item) => item.type === "CREDIT").reduce((sum, item) => sum + item.amountKobo, 0);
  const averageRating = reviews.data.length ? (reviews.data.reduce((sum, item) => sum + item.rating, 0) / reviews.data.length).toFixed(1) : "—";
  return <div className="stack"><Card><div className="eyebrow">DEMO EARNINGS</div><h2>{money(credits)}</h2><p className="subtle">Credits recorded in your wallet ledger.</p><Link className="button" href="/technician/wallet">Open wallet and payouts</Link></Card><Card><h2>Performance</h2><div className="list"><div className="list-row"><span>Average rating</span><strong>{averageRating} / 5</strong></div><div className="list-row"><span>Reviews received</span><strong>{reviews.data.length}</strong></div><div className="list-row"><span>Completed wallet credits</span><strong>{money(credits)}</strong></div></div></Card><Card><h2>Recent customer reviews</h2>{reviews.data.length ? reviews.data.map((review) => <div className="admin-list-item" key={review.id}><div><strong>{review.rating} / 5</strong><p>{review.comment}</p></div><span className="subtle">{new Date(review.createdAt).toLocaleDateString("en-NG")}</span></div>) : <p className="subtle">Customer reviews will appear here after completed bookings.</p>}</Card><Card><h2>Recent earnings</h2>{transactions.data.length ? transactions.data.map((item) => <div className="list-row" key={item.id}><span>{item.description}</span><strong>{money(item.amountKobo)}</strong></div>) : <p className="subtle">Completed-job earnings will appear here.</p>}</Card></div>;
}

export function TechnicianSettings() {
  const query = useTechnicianWorkspace();
  const update = useUpdateTechnicianWorkspace();
  if (query.isLoading || query.isError) return <QueryState loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  if (!query.data) return <Card><p className="error-text" role="alert">Settings are unavailable.</p><Button tone="secondary" onClick={() => void query.refetch()}>Try again</Button></Card>;
  return <Card><h2>Technician settings</h2><label className="check-row"><input type="checkbox" checked={query.data.settings.notificationsEnabled} onChange={(event) => update.mutate({ type: "update-settings", notificationsEnabled: event.target.checked })} />Receive job and booking notifications</label><p className="subtle">Service areas: {query.data.settings.serviceAreas.join(", ")}</p><p className="subtle">This preview keeps your service coverage at neighbourhood level.</p>{update.isError && <p className="error-text" role="alert">{update.error.message}</p>}<Link className="button button-secondary" href="/technician/onboarding">Edit profile and areas</Link></Card>;
}

export function TechnicianRequestDetail({ id }: { id: string }) {
  const requests = useJobRequests();
  const createQuote = useCreateQuote();
  const [price, setPrice] = useState("");
  const [labor, setLabor] = useState("");
  const [materials, setMaterials] = useState("");
  const [message, setMessage] = useState("");
  if (requests.isLoading || requests.isError) return <QueryState loading={requests.isLoading} error={requests.error} retry={() => void requests.refetch()} />;
  const request = requests.data?.find((item) => item.id === id);
  if (!request) return <Card><h2>Request not found</h2><p className="subtle">Return to matching requests and choose another job.</p><Link className="button" href="/technician/jobs">Matching requests</Link></Card>;
  const priceKobo = Math.round(Number(price) * 100);
  return <div className="grid-2"><Card><div className="eyebrow">{request.area.name} · {request.nearestLandmark}</div><h2>{request.service.name}</h2><Badge tone="info">{request.urgency}</Badge><p>{request.description}</p><p className="subtle">{request.isAsap ? "As soon as possible" : request.preferredStartAt ? new Date(request.preferredStartAt).toLocaleString("en-NG") : "Time to arrange"} · Neighbourhood estimate: {request.area.name}</p><Link className="button button-secondary" href="/technician/jobs">Back to matching requests</Link></Card><Card><h2>Send a quote</h2><p className="subtle">Show your price breakdown and the customer-visible fee preview before they choose.</p><form className="stack" onSubmit={(event) => { event.preventDefault(); createQuote.mutate({ requestId: request.id, data: { priceKobo, laborKobo: Math.round(Number(labor || "0") * 100), materialsKobo: Math.round(Number(materials || "0") * 100), estimatedArrivalMins: 30, message: message.trim() || "I can help with this request.", clientIdempotencyKey: makeKey() } }); }}><label className="field"><span className="field-label">Total price (₦)</span><input className="input" type="number" min="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label><div className="form-grid-2"><label className="field"><span className="field-label">Labour (₦)</span><input className="input" type="number" min="0" value={labor} onChange={(event) => setLabor(event.target.value)} /></label><label className="field"><span className="field-label">Materials (₦)</span><input className="input" type="number" min="0" value={materials} onChange={(event) => setMaterials(event.target.value)} /></label></div><p className="subtle">Platform fee preview: {money(Math.round(priceKobo * 0.1))} · Total: {money(priceKobo + Math.round(priceKobo * 0.1))}</p><label className="field"><span className="field-label">Message</span><textarea className="input" rows={3} value={message} onChange={(event) => setMessage(event.target.value)} /></label><Button type="submit" disabled={!priceKobo || createQuote.isPending}>Send quote</Button>{createQuote.isError && <p className="error-text" role="alert">{createQuote.error.message}</p>}{createQuote.isSuccess && <p className="form-success" role="status">Quote sent. The customer can compare it now.</p>}</form></Card></div>;
}

function QuoteEditor({ requestId }: { requestId: string }) {
  const quotes = useQuotes(requestId);
  const update = useUpdateQuote();
  const withdraw = useWithdrawQuote();
  if (quotes.isLoading || quotes.isError) return <QueryState loading={quotes.isLoading} error={quotes.error} retry={() => void quotes.refetch()} />;
  const mine = quotes.data?.filter((quote) => quote.technicianProfileId === "tech-1") ?? [];
  return mine.map((quote) => <Card key={quote.id}><div className="list-row"><div><strong>{money(quote.priceKobo)}</strong><div className="subtle">{quote.message}</div></div><Badge>{quote.status}</Badge></div>{quote.status === "ACTIVE" && <div className="customer-quick-links"><Button tone="secondary" onClick={() => update.mutate({ quoteId: quote.id, data: { priceKobo: quote.priceKobo + 100000, message: `${quote.message ?? ""} Updated in the demo.` } })}>Edit quote +₦1,000</Button><Button tone="secondary" onClick={() => withdraw.mutate(quote.id)}>Withdraw quote</Button></div>}{update.isError && <p className="error-text" role="alert">{update.error.message}</p>}{withdraw.isError && <p className="error-text" role="alert">{withdraw.error.message}</p>}</Card>);
}

export function TechnicianMyQuotes() {
  const requests = useJobRequests();
  const requestIds = requests.data?.map((request) => request.id) ?? [];
  const quoteQueries = useQuotesForRequests(requestIds);
  if (requests.isLoading) return <QueryState loading retry={() => void requests.refetch()} />;
  if (requests.isError) return <QueryState loading={false} error={requests.error} retry={() => void requests.refetch()} />;
  if (quoteQueries.some((item) => item.isLoading)) return <QueryState loading retry={() => { quoteQueries.forEach((item) => void item.refetch()); }} />;
  const hasQuotes = quoteQueries.some((item) => item.isError);
  if (hasQuotes) return <Card><p className="error-text">Quotes could not be loaded.</p><Button tone="secondary" onClick={() => quoteQueries.forEach((item) => void item.refetch())}>Try again</Button></Card>;
  const allQuotes = quoteQueries.flatMap((item) => item.data ?? []);
  const mine = allQuotes.filter((quote) => quote.technicianProfileId === "tech-1");
  return mine.length ? <div className="stack">{mine.map((quote) => <div key={quote.id}><QuoteEditor requestId={quote.jobRequestId} /></div>)}</div> : <Card><h2>No quotes sent yet</h2><p className="subtle">Create quotes from requests matched to your service areas.</p><Link className="button" href="/technician/jobs">Browse requests</Link></Card>;
}
