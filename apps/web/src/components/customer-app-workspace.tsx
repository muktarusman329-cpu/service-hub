"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Booking, JobRequest, PaymentRecord, Quote } from "@servicehub/shared/api-client";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { useBookings, useBooking, useCancelBooking, useChangeBookingStatus, useRevealContact } from "@servicehub/shared/hooks/use-bookings";
import { useCancelJobRequest, useCreateJobRequest, useJobRequest, useJobRequests } from "@servicehub/shared/hooks/use-job-requests";
import { useAcceptQuote, useQuotes } from "@servicehub/shared/hooks/use-quotes";
import { useConversations, useMessages, useSendMessage } from "@servicehub/shared/hooks/use-chat";
import { useCatalog } from "@servicehub/shared/hooks/use-catalog";
import { useCreatePayment, useCreateReview, useDisputeBooking, useMarkNotificationRead, useNotifications, usePayments, useReviews } from "@servicehub/shared/hooks/use-customer-tools";
import { Badge, Button, Card } from "@servicehub/ui/components";

const money = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
const makeKey = () => globalThis.crypto?.randomUUID?.() ?? `mock-${Date.now()}`;
const niceStatus = (status: string) => status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

function LoadError({ loading, error, retry }: { loading: boolean; error?: Error | null; retry: () => void }) {
  if (loading) return <Card><p role="status">Loading your ServiceHub data…</p><span className="skeleton" /><span className="skeleton short" /></Card>;
  if (error) return <Card><p className="error-text" role="alert">{error.message}</p><Button tone="secondary" onClick={retry}>Try again</Button></Card>;
  return null;
}

export function CustomerDashboard() {
  const requests = useJobRequests();
  const bookings = useBookings();
  const notifications = useNotifications();
  if (requests.isLoading || bookings.isLoading || notifications.isLoading) return <LoadError loading retry={() => { void requests.refetch(); void bookings.refetch(); void notifications.refetch(); }} />;
  const error = requests.error || bookings.error || notifications.error;
  if (error) return <LoadError loading={false} error={error as Error} retry={() => { void requests.refetch(); void bookings.refetch(); void notifications.refetch(); }} />;
  const latestRequest = requests.data?.[0];
  const latestBooking = bookings.data?.[0];
  return (
    <div className="customer-workspace">
      <div className="customer-welcome"><div><div className="eyebrow">CUSTOMER HOME · DEMO DATA</div><h1>Good morning, Fatima</h1><p className="subtle">Your service requests, bookings and updates in one place.</p></div><Link className="button" href="/app/jobs/new">Request a service</Link></div>
      <div className="customer-summary-grid">
        <Card><span className="metric-label">Open requests</span><strong className="metric-value">{requests.data?.filter((item) => ["OPEN", "DIRECTED", "QUOTED"].includes(item.status)).length ?? 0}</strong><Link href="/app/jobs" className="text-link">View requests</Link></Card>
        <Card><span className="metric-label">Active bookings</span><strong className="metric-value">{bookings.data?.filter((item) => !["COMPLETED", "CANCELLED_BY_USER", "CANCELLED_BY_TECHNICIAN", "DISPUTED"].includes(item.status)).length ?? 0}</strong><Link href="/app/bookings" className="text-link">Track bookings</Link></Card>
        <Card><span className="metric-label">Unread updates</span><strong className="metric-value">{notifications.data?.filter((item) => !item.read).length ?? 0}</strong><Link href="/app/notifications" className="text-link">Open notifications</Link></Card>
      </div>
      <div className="grid-2">
        <Card><div className="section-head"><h2>Recent request</h2><Link className="text-link" href="/app/jobs">All requests</Link></div>
          {latestRequest ? <><div className="eyebrow">{latestRequest.service.name} · {latestRequest.area.name}</div><h3>{latestRequest.nearestLandmark}</h3><p className="subtle">{latestRequest.description}</p><Badge tone="info">{niceStatus(latestRequest.status)}</Badge><p><Link className="button button-secondary" href={`/app/jobs/${latestRequest.id}`}>Open request</Link></p></> : <p className="subtle">No requests yet. Start with a short description of the help you need.</p>}
        </Card>
        <Card><div className="section-head"><h2>Next booking</h2><Link className="text-link" href="/app/bookings">All bookings</Link></div>
          {latestBooking ? <><div className="eyebrow">{latestBooking.service.name} · {latestBooking.area.name}</div><h3>{latestBooking.technician.displayName}</h3><p className="subtle">{new Date(latestBooking.scheduledStartAt).toLocaleString("en-NG")}</p><Badge tone="info">{niceStatus(latestBooking.status)}</Badge><p><Link className="button button-secondary" href={`/app/bookings/${latestBooking.id}`}>Track booking</Link></p></> : <p className="subtle">Your confirmed bookings will appear here.</p>}
        </Card>
      </div>
      <Card><h2>Keep every update in the app</h2><p className="subtle">Compare quotes, confirm job details and keep payment records together in ServiceHub.</p><div className="customer-quick-links"><Link className="button button-secondary" href="/app/messages">Messages</Link><Link className="button button-secondary" href="/app/payments">Payments and receipts</Link><Link className="button button-secondary" href="/marketplace">Browse local finds</Link></div></Card>
    </div>
  );
}

export function RequestFlow({ directTechnicianId }: { directTechnicianId?: string }) {
  const router = useRouter();
  const catalog = useCatalog();
  const createRequest = useCreateJobRequest();
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [areaId, setAreaId] = useState<string>(minnaAreas[0]?.id ?? "");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [asap, setAsap] = useState(true);
  const [budget, setBudget] = useState("");
  const allServices = catalog.data?.services.filter((service) => service.isActive) ?? [];

  if (catalog.isLoading) return <LoadError loading retry={() => void catalog.refetch()} />;
  if (catalog.isError) return <LoadError loading={false} error={catalog.error} retry={() => void catalog.refetch()} />;
  if (!allServices.length) return <Card><h2>No services available</h2><p className="subtle">There are no services to show in this mock state.</p></Card>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const request = await createRequest.mutateAsync({
      serviceId,
      cityId: "city-minna",
      areaId,
      ...(directTechnicianId ? { directTechnicianProfileId: directTechnicianId } : {}),
      nearestLandmark: landmark.trim(),
      description: description.trim(),
      isAsap: asap,
      ...(budget ? { budgetMaxKobo: Math.round(Number(budget) * 100) } : {}),
      urgency: "STANDARD",
      clientIdempotencyKey: makeKey(),
      });
      router.push(`/app/jobs/${request.id}`);
    } catch {
      return;
    }
  }

  const currentService = allServices.find((service) => service.id === serviceId);
  return (
    <form className="stack" onSubmit={(event) => void submit(event)}>
      <Card>
        <div className="section-head"><div><div className="eyebrow">STEP {step} OF 3</div><h2>{["Choose a service", "Set the place and time", "Describe the job"][step - 1]}</h2></div><Badge tone="info">Minna</Badge></div>
        <div className="progress-track" aria-label={`Step ${step} of 3`}><span style={{ width: `${step * 33.333}%` }} /></div>
        {step === 1 && <label className="field"><span className="field-label">Service</span><select className="input" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Choose a service</option>{allServices.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select>{directTechnicianId && <span className="field-hint">Your request will go directly to the technician you selected.</span>}</label>}
        {step === 2 && <div className="stack">
          <label className="field"><span className="field-label">Area in Minna</span><select className="input" value={areaId} onChange={(event) => setAreaId(event.target.value)}>{minnaAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
          <label className="field"><span className="field-label">Nearest landmark</span><input className="input" required minLength={2} value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="For example, near Bosso market" /></label>
          <label className="check-row"><input type="checkbox" checked={asap} onChange={(event) => setAsap(event.target.checked)} /> As soon as possible</label>
          <label className="field"><span className="field-label">Maximum budget (optional, ₦)</span><input className="input" type="number" min="0" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Leave blank if flexible" /></label>
        </div>}
        {step === 3 && <div className="stack">
          <label className="field"><span className="field-label">Describe the job</span><textarea className="input" rows={5} required minLength={20} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened? What would you like the technician to check?" /></label>
          <p className="subtle">Requesting: {currentService?.name} · {minnaAreas.find((area) => area.id === areaId)?.name} · {asap ? "As soon as possible" : "Time to arrange"}</p>
        </div>}
        {createRequest.isError && <p className="error-text" role="alert">{createRequest.error.message}</p>}
        <div className="request-form-actions">
          <Button tone="secondary" type="button" disabled={step === 1 || createRequest.isPending} onClick={() => setStep((value) => value - 1)}>Back</Button>
          {step < 3 ? <Button type="button" disabled={step === 1 && !serviceId || step === 2 && landmark.trim().length < 2} onClick={() => setStep((value) => value + 1)}>Continue</Button>
            : <Button type="submit" disabled={description.trim().length < 20 || createRequest.isPending}>{createRequest.isPending ? "Sending request…" : "Send request"}</Button>}
        </div>
      </Card>
      <p className="subtle">You can compare technician quotes before choosing. This is demo data; no real service request is sent.</p>
    </form>
  );
}

export function MyRequests() {
  const query = useJobRequests();
  const cancel = useCancelJobRequest();
  const rows = query.data ?? [];
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  return rows.length ? <div className="stack">{rows.map((request: JobRequest) => (
    <Card key={request.id}><div className="section-head"><div><div className="eyebrow">{request.service.name} · {request.area.name}</div><h2>{request.nearestLandmark}</h2></div><Badge tone={request.status.startsWith("CANCEL") ? "danger" : "info"}>{niceStatus(request.status)}</Badge></div>
      <p className="subtle">{request.description}</p><p className="subtle">{request.activeQuoteCount} {request.activeQuoteCount === 1 ? "quote" : "quotes"} · Created {new Date(request.createdAt).toLocaleDateString("en-NG")}</p>
      <div className="customer-quick-links"><Link className="button button-secondary" href={`/app/jobs/${request.id}`}>{request.activeQuoteCount ? "Compare quotes" : "View request"}</Link>
        {["OPEN", "DIRECTED", "QUOTED"].includes(request.status) && <Button tone="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate({ id: request.id, data: { idempotencyKey: makeKey(), reasonCode: "USER_REQUEST", reason: "Cancelled in the demo app." } })}>Cancel request</Button>}</div>
      {cancel.isError && <p className="error-text" role="alert">{cancel.error.message}</p>}
    </Card>
  ))}</div> : <Card><h2>No requests yet</h2><p className="subtle">Start by choosing a service and telling us where you need help.</p><Link className="button" href="/app/jobs/new">Request a service</Link></Card>;
}

export function RequestAndQuotes({ id }: { id: string }) {
  const router = useRouter();
  const request = useJobRequest(id);
  const quotes = useQuotes(id);
  const accept = useAcceptQuote();
  const cancel = useCancelJobRequest();
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH">("ONLINE");
  if (request.isLoading || quotes.isLoading) return <LoadError loading retry={() => { void request.refetch(); void quotes.refetch(); }} />;
  if (request.isError) return <LoadError loading={false} error={request.error} retry={() => void request.refetch()} />;
  if (quotes.isError) return <LoadError loading={false} error={quotes.error} retry={() => void quotes.refetch()} />;
  const item = request.data!;
  const quoteRows = quotes.data ?? [];
  const feePreview = (amount: number) => Math.round(amount * 0.1);
  return (
    <div className="stack">
      <section className="detail-band"><div><div className="eyebrow">{item.area.name} · {item.nearestLandmark}</div><h1>{item.service.name}</h1><p>{item.isAsap ? "As soon as possible" : item.preferredStartAt ? new Date(item.preferredStartAt).toLocaleString("en-NG") : "Time to arrange"}</p></div><Badge tone="info">{niceStatus(item.status)}</Badge></section>
      <div className="grid-2">
        <Card><h2>Request details</h2><p>{item.description}</p><p className="subtle">Budget: {item.budgetMaxKobo ? `up to ${money(item.budgetMaxKobo)}` : "Flexible"}</p><div className="timeline"><div>Request sent</div><div>{quoteRows.length ? `${quoteRows.length} quotes ready to compare` : "Waiting for technicians to reply"}</div><div>Choose a technician</div><div>Track the booking and confirm completion</div></div>
          {["OPEN", "DIRECTED", "QUOTED"].includes(item.status) && <Button tone="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate({ id, data: { idempotencyKey: makeKey(), reasonCode: "USER_REQUEST", reason: "Cancelled in the demo app." } })}>Cancel request</Button>}
          {cancel.isError && <p className="error-text" role="alert">{cancel.error.message}</p>}
        </Card>
        <Card><div className="section-head"><h2>Compare quotes</h2><Badge tone="info">{quoteRows.length}</Badge></div>
          <label className="field"><span className="field-label">Payment preference</span><select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "ONLINE" | "CASH")}><option value="ONLINE">Pay online through ServiceHub</option><option value="CASH">Pay cash after the job</option></select></label>
          {!quoteRows.length ? <div className="public-empty-state"><h3>No quotes yet</h3><p>We will show technician replies here. You can leave this request open or cancel it.</p></div> : quoteRows.map((quote: Quote) => <div className="quote-card" key={quote.id}>
            <div className="section-head"><strong>{quote.technician.displayName}</strong>{quote.technician.verified && <Badge tone="success">Verified</Badge>}</div>
            <p className="metric-value">{money(quote.priceKobo)}</p><p className="subtle">Service fee preview {money(feePreview(quote.priceKobo))} · total preview {money(quote.priceKobo + feePreview(quote.priceKobo))}</p>
            <p className="subtle">★ {quote.technician.rating.average?.toFixed(1) ?? "New"} · {quote.technician.completedJobCount} jobs · {quote.technician.areaName} · {quote.estimatedArrivalMins ?? "Time to confirm"} min</p>
            <p>{quote.message}</p>
            <Button disabled={accept.isPending} onClick={() => accept.mutate(
              { quoteId: quote.id, data: { paymentMethod, idempotencyKey: makeKey() } },
              { onSuccess: (booking) => router.push(paymentMethod === "ONLINE" ? `/app/payments/checkout/${booking.id}` : `/app/bookings/${booking.id}`) },
            )}>{accept.isPending ? "Confirming…" : `Choose ${quote.technician.displayName}`}</Button>
          </div>)}
          {accept.isError && <p className="error-text" role="alert">{accept.error.message}</p>}
        </Card>
      </div>
    </div>
  );
}

export function BookingsList() {
  const query = useBookings();
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  const bookings = query.data ?? [];
  return bookings.length ? <div className="stack">{bookings.map((booking: Booking) => (
    <Card key={booking.id}><div className="section-head"><div><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.technician.displayName}</h2></div><Badge tone={booking.status === "COMPLETED" ? "success" : booking.status === "DISPUTED" ? "danger" : "info"}>{niceStatus(booking.status)}</Badge></div>
      <p className="subtle">{booking.nearestLandmark} · {new Date(booking.scheduledStartAt).toLocaleString("en-NG")}</p><div className="history-copy">Current step: {niceStatus(booking.status)}</div>
      <Link className="button button-secondary" href={`/app/bookings/${booking.id}`}>View status timeline</Link>
    </Card>
  ))}</div> : <Card><h2>No bookings yet</h2><p className="subtle">Choose a quote to create your first booking.</p><Link className="button" href="/app/jobs">View requests</Link></Card>;
}

export function BookingDetail({ id }: { id: string }) {
  const bookingQuery = useBooking(id);
  const cancel = useCancelBooking();
  const status = useChangeBookingStatus();
  const reveal = useRevealContact();
  const dispute = useDisputeBooking();
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");
  if (bookingQuery.isLoading || bookingQuery.isError) return <LoadError loading={bookingQuery.isLoading} error={bookingQuery.error} retry={() => void bookingQuery.refetch()} />;
  const booking = bookingQuery.data!;
  const actionError = cancel.error ?? status.error ?? reveal.error ?? dispute.error;
  const allDone = ["COMPLETED", "CANCELLED_BY_USER", "CANCELLED_BY_TECHNICIAN", "DISPUTED"].includes(booking.status);
  return <div className="stack">
    <Card><div className="section-head"><div><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.technician.displayName}</h2></div><Badge tone={booking.status === "COMPLETED" ? "success" : booking.status === "DISPUTED" ? "danger" : "info"}>{niceStatus(booking.status)}</Badge></div>
      <p className="subtle">{booking.nearestLandmark} · {new Date(booking.scheduledStartAt).toLocaleString("en-NG")}</p>
      <ol className="booking-timeline">{booking.history.map((entry, index) => <li key={`${entry.toStatus}-${entry.createdAt}`}><span className="history-dot" /><div><strong>{niceStatus(entry.toStatus)}</strong><span>{new Date(entry.createdAt).toLocaleString("en-NG")} · {entry.actorRole.toLowerCase()}</span>{entry.reason && <p>{entry.reason}</p>}</div>{index === booking.history.length - 1 && <Badge tone="success">Latest</Badge>}</li>)}</ol>
    </Card>
    <Card><h2>Booking actions</h2><p className="subtle">Booking price {money(booking.priceKobo)} · fee preview {money(booking.platformFeePreviewKobo)}</p>
      <div className="customer-quick-links">
        {booking.paymentMethod === "ONLINE" && <Link className="button button-secondary" href={`/app/payments/checkout/${booking.id}`}>Payment options and receipt</Link>}
        <Link className="button button-secondary" href="/app/messages">Open chat</Link>
        {!allDone && <Button tone="secondary" disabled={reveal.isPending} onClick={() => reveal.mutate(id, { onSuccess: (details) => setContact(details.phoneNumber) })}>{reveal.isPending ? "Loading contact…" : "Reveal technician contact"}</Button>}
        {booking.status === "COMPLETED_PENDING_CONFIRMATION" && <Button disabled={status.isPending} onClick={() => status.mutate({ id, data: { status: "COMPLETED", idempotencyKey: makeKey() } })}>Confirm completion</Button>}
        {!allDone && <Button tone="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate({ id, data: { idempotencyKey: makeKey(), reasonCode: "USER_REQUEST", reason: "Cancelled in the demo app." } })}>Cancel booking</Button>}
      </div>
      {contact && <p className="form-success" role="status">Technician phone: {contact}</p>}
      {actionError && <p className="error-text" role="alert">{actionError.message}</p>}
      {!allDone && <form className="stack dispute-form" onSubmit={(event) => { event.preventDefault(); dispute.mutate({ id, reason: reason.trim() }); }}><label className="field"><span className="field-label">Need help with this booking?</span><textarea className="input" minLength={10} required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell us what went wrong before opening a demo dispute." /></label><Button tone="secondary" type="submit" disabled={dispute.isPending || reason.trim().length < 10}>Open dispute</Button></form>}
      {dispute.isSuccess && <p className="form-success" role="status">Your demo dispute has been opened.</p>}
    </Card>
  </div>;
}

export function PaymentHistory() {
  const query = usePayments();
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  const payments = query.data ?? [];
  return payments.length ? <div className="stack">{payments.map((payment: PaymentRecord) => (
    <Card key={payment.id}><div className="section-head"><div><div className="eyebrow">{payment.method === "ONLINE" ? "ONLINE PAYMENT" : "CASH PAYMENT"}</div><h2>{money(payment.amountKobo + payment.platformFeeKobo)}</h2></div><Badge tone={payment.status === "SUCCEEDED" ? "success" : payment.status === "FAILED" ? "danger" : "info"}>{niceStatus(payment.status)}</Badge></div>
      <p className="subtle">Service {money(payment.amountKobo)} · fee {money(payment.platformFeeKobo)} · {new Date(payment.createdAt).toLocaleDateString("en-NG")}</p>
      {payment.receiptNumber && <Link className="button button-secondary" href={`/app/payments/receipt/${payment.id}`}>View receipt {payment.receiptNumber}</Link>}
    </Card>
  ))}</div> : <Card><h2>No payment history</h2><p className="subtle">Payment attempts and cash preferences will appear here.</p></Card>;
}

export function PaymentCheckout({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const bookingQuery = useBooking(bookingId);
  const createPayment = useCreatePayment();
  if (bookingQuery.isLoading || bookingQuery.isError) return <LoadError loading={bookingQuery.isLoading} error={bookingQuery.error} retry={() => void bookingQuery.refetch()} />;
  const booking = bookingQuery.data!;
  const fee = booking.platformFeePreviewKobo;
  function pay(result: "SUCCEEDED" | "FAILED" | "CASH_DUE") {
    createPayment.mutate({ bookingId, result }, {
      onSuccess: (payment) => router.push(result === "FAILED" ? `/app/payments/failed/${payment.id}` : `/app/payments/receipt/${payment.id}`),
    });
  }
  return <div className="detail-layout payment-layout">
    <Card><div className="eyebrow">BOOKING · {booking.service.name}</div><h2>Payment breakdown</h2><div className="payment-breakdown"><span>Service price</span><strong>{money(booking.priceKobo)}</strong><span>Service fee preview</span><strong>{money(fee)}</strong><span>Total preview</span><strong>{money(booking.priceKobo + fee)}</strong></div><p className="subtle">Fee is shown before you choose a payment method.</p></Card>
    <Card><h2>Choose how to pay</h2><p className="subtle">This is a local demo. No real card or bank details are collected.</p>
      <div className="stack">
        <Button disabled={createPayment.isPending} onClick={() => void pay("SUCCEEDED")}>Simulate successful online payment</Button>
        <Button tone="secondary" disabled={createPayment.isPending} onClick={() => void pay("FAILED")}>Simulate failed online payment</Button>
        <Button tone="secondary" disabled={createPayment.isPending} onClick={() => void pay("CASH_DUE")}>Choose cash after the service</Button>
      </div>
      {createPayment.isPending && <p role="status">Preparing your demo payment…</p>}
      {createPayment.isError && <p className="error-text" role="alert">{createPayment.error.message}</p>}
    </Card>
  </div>;
}

export function PaymentOutcome({ id, failed }: { id: string; failed: boolean }) {
  const payments = usePayments();
  if (payments.isLoading || payments.isError) return <LoadError loading={payments.isLoading} error={payments.error} retry={() => void payments.refetch()} />;
  const payment = payments.data?.find((item) => item.id === id);
  if (!payment) return <Card><h2>Payment record not found</h2><p className="subtle">It may not be in this mock session.</p><Link href="/app/payments" className="button button-secondary">Payment history</Link></Card>;
  return <Card><div className="eyebrow">{failed ? "PAYMENT NOT COMPLETED" : payment.status === "CASH_DUE" ? "CASH PAYMENT SELECTED" : "PAYMENT RECEIPT"}</div><h1>{failed ? "Payment failed" : payment.status === "CASH_DUE" ? "Pay after the service" : "Payment successful"}</h1>
    <p className="subtle">{failed ? "No payment was collected. You can retry online or choose cash." : "This receipt is a local demo record."}</p>
    <div className="payment-breakdown"><span>Service amount</span><strong>{money(payment.amountKobo)}</strong><span>Service fee</span><strong>{money(payment.platformFeeKobo)}</strong><span>Total</span><strong>{money(payment.amountKobo + payment.platformFeeKobo)}</strong>
      {payment.receiptNumber && <><span>Receipt number</span><strong>{payment.receiptNumber}</strong></>}
    </div>
    <div className="customer-quick-links"><Link className="button" href={`/app/bookings/${payment.bookingId}`}>View booking</Link><Link className="button button-secondary" href="/app/payments">Payment history</Link>{failed && <Link className="button button-secondary" href={`/app/payments/checkout/${payment.bookingId}`}>Try again</Link>}</div>
  </Card>;
}

export function ChatList() {
  const query = useConversations();
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  return query.data?.length ? <div className="stack">{query.data.map((conversation) => <Card key={conversation.id}><div className="section-head"><div><div className="eyebrow">{conversation.request.service.name} · {conversation.request.area.name}</div><h2>Technician conversation</h2></div><Badge tone="success">{niceStatus(conversation.status)}</Badge></div><p className="subtle">{conversation.lastMessage?.body ?? "No messages yet"}</p><Link className="button button-secondary" href={`/app/messages/${conversation.id}`}>Open conversation</Link></Card>)}</div>
    : <Card><h2>No conversations yet</h2><p className="subtle">A conversation appears when you choose a technician’s quote.</p><Link href="/app/jobs" className="button button-secondary">View requests</Link></Card>;
}

export function ConversationView({ id }: { id: string }) {
  const query = useMessages(id);
  const sendMessage = useSendMessage();
  const [draft, setDraft] = useState("");
  const [sendState, setSendState] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [lastFailedText, setLastFailedText] = useState("");
  async function send(text: string) {
    setSendState("pending");
    try {
      await sendMessage.mutateAsync({ conversationId: id, data: { clientMessageKey: makeKey(), body: text } });
      setDraft("");
      setLastFailedText("");
      setSendState("sent");
    } catch {
      setLastFailedText(text);
      setSendState("failed");
    }
  }
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  return <div className="stack">
    <aside className="payments-in-app-banner"><strong>Keep payments in the app</strong><span>Never share payment details in chat. Use the booking’s payment options and receipt history.</span></aside>
    <Card><div className="chat-messages">{query.data?.items.map((message) => <div key={message.id} className={message.senderId === "user-current" ? "chat-message chat-message-own" : "chat-message"}><p>{message.body}</p><span>{new Date(message.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div>
      <form className="chat-send-form" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void send(draft.trim()); }}>
        <label className="sr-only" htmlFor="chat-draft">Write a message</label><input id="chat-draft" className="input" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" />
        <Button type="submit" disabled={!draft.trim() || sendState === "pending"}>{sendState === "pending" ? "Sending…" : "Send"}</Button>
      </form>
      {sendState === "sent" && <p className="form-success" role="status">Message sent in this demo.</p>}
      {sendState === "failed" && <p className="error-text" role="alert">Message failed to send. Check the Dev State error option or retry.</p>}
      {sendState === "failed" && <Button tone="secondary" onClick={() => void send(lastFailedText)}>Retry message</Button>}
    </Card>
  </div>;
}

export function ReviewsWorkspace() {
  const bookings = useBookings();
  const reviews = useReviews();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [bookingId, setBookingId] = useState("");
  if (bookings.isLoading || reviews.isLoading) return <LoadError loading retry={() => { void bookings.refetch(); void reviews.refetch(); }} />;
  const error = bookings.error || reviews.error;
  if (error) return <LoadError loading={false} error={error as Error} retry={() => { void bookings.refetch(); void reviews.refetch(); }} />;
  const reviewedIds = new Set(reviews.data?.map((review) => review.bookingId) ?? []);
  const eligible = bookings.data?.filter((booking) => booking.status === "COMPLETED" && !reviewedIds.has(booking.id)) ?? [];
  return <div className="stack">
    <Card><h2>Share a review</h2>{eligible.length ? <form className="stack" onSubmit={(event) => { event.preventDefault(); createReview.mutate({ bookingId: bookingId || eligible[0]!.id, rating, comment }); }}>
      <label className="field"><span className="field-label">Completed booking</span><select className="input" value={bookingId || eligible[0]!.id} onChange={(event) => setBookingId(event.target.value)}>{eligible.map((booking) => <option key={booking.id} value={booking.id}>{booking.service.name} with {booking.technician.displayName}</option>)}</select></label>
      <label className="field"><span className="field-label">Rating</span><select className="input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} out of 5</option>)}</select></label>
      <label className="field"><span className="field-label">Your review</span><textarea className="input" required minLength={10} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What went well? What could be better?" /></label>
      <Button type="submit" disabled={createReview.isPending || comment.trim().length < 10}>{createReview.isPending ? "Submitting…" : "Submit review"}</Button>
      {createReview.isError && <p className="error-text" role="alert">{createReview.error.message}</p>}
      {createReview.isSuccess && <p className="form-success" role="status">Thank you. Your demo review has been saved.</p>}
    </form> : <p className="subtle">Reviews are available after a booking is complete, and each completed booking can be reviewed once.</p>}</Card>
    {reviews.data?.map((review) => <Card key={review.id}><div className="section-head"><h2>{review.technicianName}</h2><Badge tone="success">{review.rating} / 5</Badge></div><p>{review.comment}</p><p className="subtle">{new Date(review.createdAt).toLocaleDateString("en-NG")}</p></Card>)}
  </div>;
}

export function CustomerSupport() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="customer-support-layout">
      <Card>
        <h2>Report a problem</h2>
        <p className="subtle">Let us know what went wrong. This form is a local demo and does not send a real support ticket.</p>
        <form className="stack" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <label className="field">
            <span className="field-label">What type of problem?</span>
            <select className="input" required defaultValue="">
              <option value="" disabled>Choose a problem type</option>
              <option value="booking">Booking issue</option>
              <option value="payment">Payment problem</option>
              <option value="technician">Technician behavior</option>
              <option value="technical">Technical issue</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Booking ID (if applicable)</span>
            <input className="input" placeholder="Enter booking ID" />
          </label>
          <label className="field">
            <span className="field-label">Describe the problem</span>
            <textarea className="input" rows={5} required minLength={20} maxLength={2000} placeholder="Tell us what happened and what you expected" />
          </label>
          <Button type="submit">Submit report</Button>
          {submitted && <p className="form-success" role="status">Demo report submitted. No support ticket was sent.</p>}
        </form>
      </Card>
      <Card>
        <h2>Need help right away?</h2>
        <p className="subtle">Contact our support team directly.</p>
        <div className="stack">
          <p>Email: support@servicehub.ng</p>
          <p>Phone: +234 800 123 4567 (Mon-Fri, 8am-6pm WAT)</p>
        </div>
      </Card>
    </div>
  );
}

export function NotificationsWorkspace() {
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error} retry={() => void query.refetch()} />;
  return query.data?.length ? <div className="stack">{query.data.map((item) => <Card key={item.id}><div className="section-head"><div><h2>{item.title}</h2><p className="subtle">{item.body}</p></div><Badge tone={item.read ? "info" : "success"}>{item.read ? "Read" : "New"}</Badge></div><div className="section-head"><span className="subtle">{new Date(item.createdAt).toLocaleString("en-NG")}</span>{!item.read && <Button tone="secondary" disabled={markRead.isPending} onClick={() => markRead.mutate(item.id)}>Mark as read</Button>}</div>{markRead.isError && <p className="error-text" role="alert">{markRead.error.message}</p>}</Card>)}</div>
    : <Card><h2>No notifications</h2><p className="subtle">Updates about quotes and bookings will appear here.</p></Card>;
}
