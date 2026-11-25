"use client";

import Link from "next/link";
import { useBookings } from "@servicehub/shared/hooks/use-bookings";
import { useJobRequests } from "@servicehub/shared/hooks/use-job-requests";
import { Badge, Button, Card } from "@servicehub/ui/components";
import type { Booking } from "@servicehub/shared/api-client";

function LoadError({ loading, error, retry }: { loading: boolean; error?: Error | null; retry: () => void }) {
  if (loading) return <Card><p role="status">Loading live requests…</p></Card>;
  if (error) return <Card><p className="error-text" role="alert">{error.message}</p><Button tone="secondary" onClick={retry}>Retry</Button></Card>;
  return null;
}

export function JobList({ audience }: { audience: "user" | "technician" | "admin" }) {
  const requests = useJobRequests(audience === "technician" ? "technician" : undefined);
  const bookingsQuery = useBookings();
  const query = audience === "admin" ? bookingsQuery : requests;
  const retry = () => { void requests.refetch(); void bookingsQuery.refetch(); };
  if (query.isLoading || query.isError) return <LoadError loading={query.isLoading} error={query.error as Error | null} retry={retry} />;
  if (audience === "admin") {
    const bookings = (bookingsQuery.data ?? []) as Booking[];
    return bookings.length ? <div className="stack">{bookings.map((booking) => <Card key={booking.id}><div className="section-head"><div><div className="eyebrow">{booking.service.name} · {booking.area.name}</div><h2>{booking.technician.displayName}</h2></div><Badge>{booking.status.replaceAll("_", " ")}</Badge></div><p>{booking.nearestLandmark}</p><Link className="button button-secondary" href={`/admin/jobs/${booking.id}`}>Open booking</Link></Card>)}</div> : <Card><h2>No bookings yet</h2></Card>;
  }
  const rows = requests.data ?? [];
  return rows.length ? <div className="stack">{rows.map((request) => <Card key={request.id}><div className="section-head"><div><div className="eyebrow">{request.service.name} · {request.area.name}</div><h2>{request.nearestLandmark}</h2></div><Badge>{request.status.replaceAll("_", " ")}</Badge></div><p>{request.description}</p><p className="subtle">{request.activeQuoteCount} quote(s)</p><Link className="button button-secondary" href={audience === "user" ? `/app/jobs/${request.id}` : `/technician/jobs/${request.id}`}>View request</Link></Card>)}</div> : <Card><h2>{audience === "technician" ? "No matching requests" : "No requests yet"}</h2></Card>;
}
