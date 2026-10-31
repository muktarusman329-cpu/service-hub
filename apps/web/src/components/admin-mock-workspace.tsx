"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminWorkspace, AdminWorkspaceAction } from "@servicehub/shared/api-client";
import { useAdminWorkspace, useTechnicianWorkspace, useUpdateAdminWorkspace } from "@servicehub/shared/hooks/use-workspaces";
import { useBookings } from "@servicehub/shared/hooks/use-bookings";
import { usePayments } from "@servicehub/shared/hooks/use-customer-tools";
import { categories } from "@servicehub/shared/fixtures/categories";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { Badge, Button, Card } from "@servicehub/ui/components";
import { messages } from "@servicehub/shared/messages/en";

type PanelKind = "overview" | "users" | "user-detail" | "roles" | "audit" | "technician-review" | "technician-detail" | "catalog" | "flags" | "disputes" | "booking-detail" | "payments" | "settings" | "security" | "notifications";
const money = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

function QueryState({ loading, error, retry }: { loading: boolean; error?: Error | null; retry: () => void }) {
  if (loading) return <Card><p role="status">Loading admin demo data…</p><span className="skeleton" /></Card>;
  if (error) return <Card><p className="error-text" role="alert">{error.message}</p><Button tone="secondary" onClick={retry}>Try again</Button></Card>;
  return null;
}

function ReasonAction({ label, onSave, disabled }: { label: string; onSave: (reason: string) => void; disabled: boolean }) {
  const [reason, setReason] = useState("");
  return <form className="admin-reason-action" onSubmit={(event) => { event.preventDefault(); onSave(reason.trim()); }}>
    <label className="field"><span className="field-label">Reason or review note</span><input className="input" required minLength={4} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <Button type="submit" tone="secondary" disabled={disabled || reason.trim().length < 4}>{label}</Button>
  </form>;
}

export function AdminMockWorkspace({ kind, id }: { kind: PanelKind; id?: string }) {
  const query = useAdminWorkspace();
  const technician = useTechnicianWorkspace();
  const bookings = useBookings();
  const payments = usePayments();
  const update = useUpdateAdminWorkspace();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [commission, setCommission] = useState("");
  const [refund, setRefund] = useState("");
  const [settings, setSettings] = useState<AdminWorkspace["settings"] | null>(null);
  const refresh = () => { void query.refetch(); void technician.refetch(); void bookings.refetch(); void payments.refetch(); };
  if (query.isLoading || ((kind === "overview" || kind === "payments" || kind === "disputes") && (bookings.isLoading || payments.isLoading))) return <QueryState loading retry={refresh} />;
  const error = query.error || ((kind === "technician-review" || kind === "technician-detail") ? technician.error : null) || ((kind === "overview" || kind === "payments" || kind === "disputes" || kind === "booking-detail") ? bookings.error || payments.error : null);
  if (error) return <QueryState loading={false} error={error as Error} retry={refresh} />;
  const data = query.data;
  if (!data) return <QueryState loading={false} error={new Error("Admin data is unavailable. Use Try again to reload this screen.")} retry={refresh} />;
  const applicationData = technician.data?.application;
  const visibleUsers = data.users.filter((user) => (statusFilter === "ALL" || user.status === statusFilter) && `${user.displayName} ${user.email} ${user.areaName}`.toLowerCase().includes(search.toLowerCase()));
  const application = kind === "technician-detail" ? { id: id ?? data.users.find((user) => user.role === "TECHNICIAN")?.id } : null;
  const applicationId = kind === "technician-detail" ? (id === "application-tech-1" ? id : "application-tech-1") : "application-tech-1";
  const booking = bookings.data?.find((item) => item.id === id);
  const selectedUser = data.users.find((user) => user.id === id);
  const filteredFlags = data.flaggedMessages.filter((flag) => statusFilter === "ALL" || flag.status === statusFilter);
  const filteredDisputes = data.disputes.filter((dispute) => statusFilter === "ALL" || dispute.status === statusFilter);
  const commissionValue = Number(commission || data.commissionPercent);

  const heading: Record<PanelKind, string> = {
    overview: messages.adminConsole.overview, users: "User directory", "user-detail": "User details", roles: "Roles and permissions", audit: messages.adminConsole.auditLog,
    "technician-review": messages.adminConsole.technicianReview, "technician-detail": "Technician application", catalog: "Catalog and city controls",
    flags: messages.adminConsole.flaggedMessages, disputes: messages.adminConsole.disputes, "booking-detail": "Booking details", payments: messages.adminConsole.payments,
    settings: messages.adminConsole.settings, security: "Administrator security", notifications: "Notification templates",
  };
  const mutate = (action: AdminWorkspaceAction) => update.mutate(action);

  return <div className="stack">
    <div className="page-heading"><div><div className="eyebrow">ADMIN CONSOLE · MOCK DATA</div><h1>{heading[kind]}</h1><p className="subtle">Changes stay in this browser session and are recorded in the demo audit log.</p></div><Link className="button button-secondary" href="/admin">Overview</Link></div>
    {update.isError && <p className="error-text" role="alert">{update.error.message}</p>}
    {update.isSuccess && <p className="form-success" role="status">Saved to the admin demo workspace.</p>}

    {kind === "overview" && <><div className="grid-4">{[
      ["Signups", String(data.users.length + 245), "Last 30 days"], ["Active technicians", String(data.users.filter((user) => user.role === "TECHNICIAN" && user.status === "ACTIVE").length + 34), "Across launch areas"],
      ["Jobs completed", String(bookings.data?.filter((item) => item.status === "COMPLETED").length ?? 0), "Mock booking records"], ["GMV", money((bookings.data ?? []).reduce((sum, item) => sum + item.priceKobo, 0)), "Tracked bookings"],
    ].map(([label, value, note]) => <Card key={label}><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-foot">{note}</span></Card>)}</div>
      <div className="grid-2"><Card><h2>Jobs by category · demo snapshot</h2><div className="admin-chart">{categories.slice(0, 5).map((category, index) => <div key={category.id}><div className="list-row"><span>{category.name}</span><span>{[26, 19, 14, 11, 8][index]}</span></div><div className="bar-track"><div className="bar" style={{ width: `${[85, 67, 51, 38, 27][index]}%` }} /></div></div>)}</div><p className="field-hint">Source: Mock data · sample activity counts.</p></Card><Card><h2>Operational signals</h2><div className="list"><div className="list-row"><span>Repeat-user rate</span><strong>28% · sample</strong></div><div className="list-row"><span>Average response time</span><strong>18 min · sample</strong></div><div className="list-row"><span>Commission</span><strong>{data.commissionPercent}%</strong></div></div><div className="customer-quick-links"><Link className="button button-secondary" href="/admin/technicians">Review technicians</Link><Link className="button button-secondary" href="/admin/jobs/flags">Moderate flags</Link><Link className="button button-secondary" href="/admin/jobs/disputes">Resolve disputes</Link></div></Card></div></>}

    {(kind === "users" || kind === "user-detail") && (kind === "users" ? <Card><div className="form-grid-2"><label className="field"><span className="field-label">Search users</span><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email or area" /></label><label className="field"><span className="field-label">Status</span><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>ALL</option><option>ACTIVE</option><option>SUSPENDED</option></select></label></div>{visibleUsers.length ? <div className="list">{visibleUsers.map((user) => <div className="admin-list-item" key={user.id}><div><Link href={`/admin/users/${user.id}`}><strong>{user.displayName}</strong></Link><div className="subtle">{user.email} · {user.role} · {user.areaName}</div></div><Badge tone={user.status === "ACTIVE" ? "success" : "danger"}>{user.status}</Badge><ReasonAction label={user.status === "ACTIVE" ? "Suspend" : "Reactivate"} disabled={update.isPending} onSave={(reason) => mutate({ type: "set-user-status", userId: user.id, status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE", reason })} /></div>)}</div> : <p>{messages.adminConsole.emptyQueue}</p>}</Card> : selectedUser ? <Card><h2>{selectedUser.displayName}</h2><p>{selectedUser.email} · {selectedUser.role}</p><p className="subtle">Joined {new Date(selectedUser.joinedAt).toLocaleDateString("en-NG")} · {selectedUser.areaName} · {selectedUser.status}</p><Link className="button button-secondary" href="/admin/users">Back to users</Link></Card> : <Card><h2>User not found</h2><Link className="button" href="/admin/users">Return to users</Link></Card>)}

    {kind === "roles" && <Card><h2>Permission matrix</h2><div className="table-wrap"><table className="data-table"><thead><tr><th>Capability</th><th>Customer</th><th>Technician</th><th>Admin</th></tr></thead><tbody>{[["Manage own requests", "Yes", "No", "Review"], ["Submit quotes", "No", "Yes", "Review"], ["Manage own bookings", "Yes", "Yes", "All"], ["Moderate marketplace", "No", "No", "Yes"], ["Resolve disputes", "No", "No", "Yes"], ["Change platform settings", "No", "No", "Yes"]].map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div><p className="subtle">This matrix describes the mock UI only; it does not change backend permissions.</p></Card>}
    {kind === "audit" && <Card><h2>Recent administrative actions</h2>{data.auditLog.length ? <div className="list">{data.auditLog.map((item) => <div className="admin-list-item" key={item.id}><div><strong>{item.action}</strong><div className="subtle">{item.actor} · {item.reason}</div></div><time>{new Date(item.createdAt).toLocaleString("en-NG")}</time></div>)}</div> : <p className="subtle">No admin actions recorded yet. Changes to users, reviews, flags, disputes and settings appear here.</p>}</Card>}

    {(kind === "technician-review" || kind === "technician-detail") && <Card><Badge tone={applicationData?.status === "APPROVED" ? "success" : "warning"}>{applicationData?.status.replaceAll("_", " ") ?? "Loading status"}</Badge><h2>{applicationData?.displayName || "Technician applicant"}</h2><p className="subtle">Application from {applicationData?.areas.join(", ") || "Minna"} · {applicationData?.skills.join(", ") || "No skills selected"} · KYC is masked by default.</p><div className="admin-review-document"><strong>Identity document</strong><span>•••••••• {applicationData?.kycDocumentName ?? "demo identity file"}</span><KycReveal applicationId={applicationId} update={mutate} disabled={update.isPending} /></div><label className="field"><span className="field-label">Review note</span><input className="input" id="technician-review-note" placeholder="Required for every decision" /></label><div className="customer-quick-links">{(["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const).map((status) => <Button key={status} tone={status === "APPROVED" ? "primary" : "secondary"} disabled={update.isPending} onClick={() => { const note = (document.getElementById("technician-review-note") as HTMLInputElement | null)?.value ?? ""; mutate({ type: "review-technician", applicationId, status, note }); }}>{status.replaceAll("_", " ")}</Button>)}</div><p className="subtle">Application status also updates the technician’s dashboard and public profile demo.</p></Card>}

    {kind === "catalog" && <><Card><h2>Categories and services</h2><p className="subtle">Toggle availability in the Minna mock catalog.</p>{categories.map((category) => <section className="admin-catalog-section" key={category.id}><div className="list-row"><strong>{category.name}</strong><input aria-label={`Enable ${category.name}`} type="checkbox" checked={data.catalogEnabled[category.id] ?? category.isActive} onChange={(event) => mutate({ type: "toggle-catalog", itemId: category.id, enabled: event.target.checked })} /></div>{category.services.map((service) => <div className="list-row admin-catalog-child" key={service.id}><span>{service.name}</span><input aria-label={`Enable ${service.name}`} type="checkbox" checked={data.catalogEnabled[service.id] ?? service.isActive} onChange={(event) => mutate({ type: "toggle-catalog", itemId: service.id, enabled: event.target.checked })} /></div>)}</section>)}</Card><Card><h2>Cities and service areas</h2><div className="list">{minnaAreas.map((area) => <div className="list-row" key={area.id}><span>Minna · {area.name}</span><Badge tone="success">Enabled</Badge></div>)}</div></Card></>}

    {kind === "flags" && <Card><p className="admin-signal-notice">{messages.adminConsole.flagNotice}</p><label className="field"><span className="field-label">Filter queue</span><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>ALL</option><option>OPEN</option><option>DISMISSED</option><option>ACTIONED</option></select></label>{filteredFlags.length ? filteredFlags.map((flag) => <div className="admin-list-item" key={flag.id}><div><strong>{flag.senderName}</strong><p>{flag.message}</p><span className="subtle">Signal: {flag.signal} · {flag.status}</span></div><div className="admin-actions"><ReasonAction label="Dismiss flag" disabled={update.isPending} onSave={(reason) => mutate({ type: "resolve-flag", flagId: flag.id, status: "DISMISSED", reason })}/><ReasonAction label="Take action" disabled={update.isPending} onSave={(reason) => mutate({ type: "resolve-flag", flagId: flag.id, status: "ACTIONED", reason })}/></div></div>) : <p>{messages.adminConsole.emptyQueue}</p>}</Card>}

    {kind === "disputes" && <Card><label className="field"><span className="field-label">Filter disputes</span><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>ALL</option><option>OPEN</option><option>RESOLVED</option></select></label>{filteredDisputes.length ? filteredDisputes.map((dispute) => <div className="admin-list-item" key={dispute.id}><div><strong>{dispute.customerName} · {dispute.technicianName}</strong><p>{dispute.reason}</p><span className="subtle">{dispute.bookingId} · {dispute.status}</span></div>{dispute.status === "OPEN" && <div className="stack"><label className="field"><span className="field-label">Refund amount (₦)</span><input className="input" type="number" min="0" value={refund} onChange={(event) => setRefund(event.target.value)} /></label><ReasonAction label="Resolve dispute" disabled={update.isPending} onSave={(resolution) => mutate({ type: "resolve-dispute", bookingId: dispute.bookingId, resolution, refundKobo: Math.round(Number(refund) * 100) })}/></div>}</div>) : <p>{messages.adminConsole.emptyQueue}</p>}</Card>}

    {kind === "payments" && <><Card><h2>Payment transactions</h2>{payments.data?.length ? <div className="list">{payments.data.map((payment) => <div className="admin-list-item" key={payment.id}><div><strong>{payment.method} · {payment.status}</strong><div className="subtle">Booking {payment.bookingId} · {new Date(payment.createdAt).toLocaleString("en-NG")}</div></div><strong>{money(payment.amountKobo + payment.platformFeeKobo)}</strong></div>)}</div> : <p className="subtle">No transactions in this mock state.</p>}</Card><Card><h2>Commission rules</h2><p className="subtle">Current commission: {data.commissionPercent}%</p><div className="form-inline"><input className="input" type="number" min="0" max="30" value={commission} onChange={(event) => setCommission(event.target.value)} aria-label="Commission percent" placeholder="Percent" /><ReasonAction label="Save commission" disabled={update.isPending} onSave={(reason) => mutate({ type: "set-commission", percent: commissionValue, reason })}/></div></Card><Card><h2>Ledger</h2><p className="subtle">The demo ledger is derived from payment records and technician wallet transactions.</p><Link className="button button-secondary" href="/admin/audit">View audit log</Link></Card></>}

    {kind === "settings" && <AdminSettings initial={data.settings} update={mutate} pending={update.isPending} settings={settings} setSettings={setSettings} />}
    {kind === "security" && <Card><h2>Admin two-factor enrollment</h2><p className="subtle">This local demo shows the enrollment state only. It does not configure a real authenticator.</p><Badge tone={data.settings.twoFactorEnabled ? "success" : "warning"}>{data.settings.twoFactorEnabled ? "Enabled" : "Not enrolled"}</Badge><Button tone="secondary" onClick={() => mutate({ type: "save-admin-settings", settings: { ...data.settings, twoFactorEnabled: !data.settings.twoFactorEnabled } })}>{data.settings.twoFactorEnabled ? "Disable demo 2FA" : "Enroll demo 2FA"}</Button></Card>}
    {kind === "notifications" && <NotificationTemplates save={() => mutate({ type: "save-admin-settings", settings: data.settings })} />}
    {kind === "user-detail" && selectedUser && <Card><h2>Account actions</h2><ReasonAction label={selectedUser.status === "ACTIVE" ? "Suspend account" : "Reactivate account"} disabled={update.isPending} onSave={(reason) => mutate({ type: "set-user-status", userId: selectedUser.id, status: selectedUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE", reason })}/></Card>}
    {kind === "technician-detail" && application && <Link className="button button-secondary" href="/admin/technicians">Back to queue</Link>}
    {kind === "booking-detail" && booking && <><Card><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.nearestLandmark}</h2><p>{booking.technician.displayName} · {money(booking.priceKobo)} · fee {money(booking.platformFeePreviewKobo)}</p><Badge>{booking.status.replaceAll("_", " ")}</Badge><ol className="booking-timeline">{booking.history.map((entry) => <li key={`${entry.toStatus}-${entry.createdAt}`}><span className="history-dot" /><div><strong>{entry.toStatus.replaceAll("_", " ")}</strong><span>{entry.actorRole} · {new Date(entry.createdAt).toLocaleString("en-NG")}</span>{entry.reason && <p>{entry.reason}</p>}</div></li>)}</ol><Link className="button button-secondary" href="/admin/jobs/disputes">Disputes queue</Link></Card><Card><h2>Payment records</h2>{payments.data?.filter((item) => item.bookingId === id).map((item) => <div className="list-row" key={item.id}><span>{item.method} · {item.status}</span><strong>{money(item.amountKobo + item.platformFeeKobo)}</strong></div>)}</Card></>}
  </div>;
}

function KycReveal({ applicationId, update, disabled }: { applicationId: string; update: (action: AdminWorkspaceAction) => void; disabled: boolean }) {
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState(false);
  return <div className="admin-kyc-reveal"><label className="field"><span className="field-label">Reason to view KYC</span><input className="input" value={reason} onChange={(event) => setReason(event.target.value)} /></label><Button tone="secondary" disabled={disabled || reason.trim().length < 4} onClick={() => { update({ type: "reveal-kyc", applicationId, reason }); setRevealed(true); }}>{revealed ? "Reveal logged" : "Reveal masked preview"}</Button>{revealed && <span className="field-hint">Name shown for demo: Ibrahim Mohammed · document remains a placeholder.</span>}</div>;
}

function AdminSettings({ initial, update, pending, settings, setSettings }: { initial: { cancellationWindowHours: number; autoCompleteHours: number; maxActiveBookings: number; guarantorRequired: boolean; retentionDays: number; otpChannel: "SMS" | "EMAIL"; twoFactorEnabled: boolean }; update: (action: AdminWorkspaceAction) => void; pending: boolean; settings: typeof initial | null; setSettings: (value: typeof initial) => void }) {
  const value = settings ?? initial;
  return <Card><h2>Platform rules</h2><div className="form-grid-2">
    <label className="field"><span className="field-label">Cancellation window (hours)</span><input className="input" type="number" min="0" value={value.cancellationWindowHours} onChange={(event) => setSettings({ ...value, cancellationWindowHours: Number(event.target.value) })} /></label>
    <label className="field"><span className="field-label">Auto-complete window (hours)</span><input className="input" type="number" min="1" value={value.autoCompleteHours} onChange={(event) => setSettings({ ...value, autoCompleteHours: Number(event.target.value) })} /></label>
    <label className="field"><span className="field-label">Maximum active bookings</span><input className="input" type="number" min="1" value={value.maxActiveBookings} onChange={(event) => setSettings({ ...value, maxActiveBookings: Number(event.target.value) })} /></label>
    <label className="field"><span className="field-label">Retention period (days)</span><input className="input" type="number" min="30" value={value.retentionDays} onChange={(event) => setSettings({ ...value, retentionDays: Number(event.target.value) })} /></label>
    <label className="field"><span className="field-label">OTP channel</span><select className="input" value={value.otpChannel} onChange={(event) => setSettings({ ...value, otpChannel: event.target.value as "SMS" | "EMAIL" })}><option>SMS</option><option>EMAIL</option></select></label>
    <label className="check-row"><input type="checkbox" checked={value.guarantorRequired} onChange={(event) => setSettings({ ...value, guarantorRequired: event.target.checked })} />Require a guarantor for onboarding</label>
  </div><Button disabled={pending} onClick={() => update({ type: "save-admin-settings", settings: value })}>{messages.adminConsole.save}</Button></Card>;
}

function NotificationTemplates({ save }: { save: () => void }) {
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({
    "Request received": "Your request is ready for local technicians to review.",
    "New quote": "A technician sent you a quote. Compare the price and details in ServiceHub.",
    "Booking accepted": "Your booking is confirmed. Open the app to track the status.",
    "Payment receipt": "Your payment record is available in your ServiceHub account.",
    "Dispute update": "There is an update about your booking dispute.",
  });
  return <Card><h2>Notification templates</h2>{Object.entries(templates).map(([name, text]) => <label className="field" key={name}><span className="field-label">{name}</span><textarea className="input" rows={2} value={text} onChange={(event) => setTemplates((current) => ({ ...current, [name]: event.target.value }))} /></label>)}<p className="subtle">Saved template copy is held in this component session for review.</p><Button onClick={() => { save(); setSaved(true); }}>{messages.adminConsole.save}</Button>{saved && <p className="form-success" role="status">Template preview saved.</p>}</Card>;
}
