"use client";

import Link from "next/link";
import { useState } from "react";
import type { Booking, JobRequest } from "@servicehub/shared/api-client";
import { useBookings } from "@servicehub/shared/hooks/use-bookings";
import { useJobRequests } from "@servicehub/shared/hooks/use-job-requests";
import { useCreateQuote } from "@servicehub/shared/hooks/use-quotes";
import { Badge, Button, Card } from "@servicehub/ui/components";

const money = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

function QuoteForm({ request }: { request: JobRequest }) {
  const createQuote = useCreateQuote();
  const [price, setPrice] = useState("");
  const [labor, setLabor] = useState("");
  const [materials, setMaterials] = useState("");
  const [message, setMessage] = useState("");
  const priceKobo = Math.round(Number(price) * 100);
  const feePreview = Math.round(priceKobo * 0.1);
  return <form className="stack technician-quote-form" onSubmit={(event) => {
    event.preventDefault();
    createQuote.mutate({ requestId: request.id, data: {
      priceKobo,
      laborKobo: labor ? Math.round(Number(labor) * 100) : undefined,
      materialsKobo: materials ? Math.round(Number(materials) * 100) : undefined,
      estimatedArrivalMins: 30,
      message: message.trim() || "I can help with this request.",
      clientIdempotencyKey: globalThis.crypto?.randomUUID?.() ?? `quote-${Date.now()}`,
    } }, { onSuccess: () => { setPrice(""); setLabor(""); setMaterials(""); setMessage(""); } });
  }}>
    <div className="form-grid-2">
      <label className="field"><span className="field-label">Total price (₦)</span><input className="input" type="number" min="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label>
      <label className="field"><span className="field-label">Labour (₦)</span><input className="input" type="number" min="0" value={labor} onChange={(event) => setLabor(event.target.value)} /></label>
      <label className="field"><span className="field-label">Materials (₦)</span><input className="input" type="number" min="0" value={materials} onChange={(event) => setMaterials(event.target.value)} /></label>
      <div className="field"><span className="field-label">Fee preview</span><strong>{priceKobo > 0 ? money(feePreview) : "Enter a price"}</strong></div>
    </div>
    <label className="field"><span className="field-label">Message to customer</span><textarea className="input" rows={3} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what your quote includes." /></label>
    {createQuote.isError && <p className="error-text" role="alert">{createQuote.error.message}</p>}
    {createQuote.isSuccess && <p className="form-success" role="status">Quote sent in the demo.</p>}
    <Button type="submit" disabled={createQuote.isPending || priceKobo <= 0}>{createQuote.isPending ? "Sending quote…" : "Send quote"}</Button>
  </form>;
}

function LoadingState({ retry }: { retry: () => void }) {
  return <Card><p role="status">Loading requests…</p><span className="skeleton" /><span className="skeleton short" /><Button tone="secondary" onClick={retry}>Try again</Button></Card>;
}

export function JobList({ audience }: { audience: "user" | "technician" | "admin" }) {
  const requests = useJobRequests();
  const bookingsQuery = useBookings();
  const query = audience === "admin" ? bookingsQuery : requests;
  const retry = () => { void requests.refetch(); void bookingsQuery.refetch(); };
  if (query.isLoading) return <LoadingState retry={retry} />;
  if (query.isError) return <Card><p className="error-text" role="alert">{query.error.message}</p><Button tone="secondary" onClick={retry}>Try again</Button></Card>;

  if (audience === "admin") {
    const bookings = (bookingsQuery.data ?? []) as Booking[];
    return bookings.length ? <div className="stack">{bookings.map((booking) => (
      <Card key={booking.id}><div className="section-head"><div><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.technician.displayName}</h2></div><Badge tone={booking.status === "COMPLETED" ? "success" : booking.status === "DISPUTED" ? "danger" : "info"}>{booking.status.replaceAll("_", " ")}</Badge></div>
        <p className="subtle">{booking.nearestLandmark} · {money(booking.priceKobo)} · {booking.history.length} status updates</p>
        <Link className="button button-secondary" href={`/admin/jobs/${booking.id}`}>Review booking</Link>
      </Card>
    ))}</div> : <Card><h2>No bookings yet</h2><p className="subtle">Bookings will appear after a customer accepts a quote.</p></Card>;
  }

  const allRequests = (requests.data ?? []) as JobRequest[];
  const rows = audience === "technician"
    ? allRequests.filter((request) => !request.booking && ["OPEN", "DIRECTED", "QUOTED"].includes(request.status))
    : allRequests;
  return rows.length ? <div className="stack">{rows.map((request) => (
    <Card key={request.id}><div className="section-head"><div><div className="eyebrow">{request.service.name} · {request.area.name}</div><h2>{request.nearestLandmark}</h2></div><Badge tone={request.status.startsWith("CANCEL") ? "danger" : "info"}>{request.status.replaceAll("_", " ")}</Badge></div>
      <p>{request.description}</p><p className="subtle">{request.isAsap ? "As soon as possible" : request.preferredStartAt ? new Date(request.preferredStartAt).toLocaleString("en-NG") : "Time to arrange"} · {request.activeQuoteCount} quote(s)</p>
      {audience === "user" ? <Link className="button button-secondary" href={`/app/jobs/${request.id}`}>Open request</Link>
        : <><Link className="button button-secondary" href={`/technician/jobs/${request.id}`}>View request details</Link><QuoteForm request={request} /></>}
    </Card>
  ))}</div> : <Card><h2>{audience === "technician" ? "No matching requests right now" : "No requests yet"}</h2><p className="subtle">{audience === "technician" ? "Matching requests in your service areas will appear here." : "Create a service request to receive local quotes."}</p>{audience === "user" && <Link className="button" href="/app/jobs/new">Request a service</Link>}</Card>;
}
