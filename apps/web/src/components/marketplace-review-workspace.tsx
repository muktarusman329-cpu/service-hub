"use client";

import type { MarketListing } from "@servicehub/shared/api-client";
import { useReviewMarketplaceListing, usePendingMarketplaceListings } from "@servicehub/shared/hooks/use-marketplace";
import { AppIcon } from "@/components/app-icon";

export function MarketplaceReviewWorkspace() {
  const { data: listings = [], isLoading, isError, error, refetch } = usePendingMarketplaceListings();
  const review = useReviewMarketplaceListing();
  return <main className="content"><div className="page-heading"><div><div className="eyebrow">ADMIN · MARKETPLACE</div><h1>Review listings</h1></div></div>{review.isError && <p className="form-error" role="alert">{review.error.message}</p>}{isLoading ? <p role="status">Loading submitted listings…</p> : isError ? <section role="alert"><p>{error.message}</p><button className="button button-secondary" onClick={() => void refetch()}>Retry</button></section> : listings.length ? <div className="marketplace-review-list">{listings.map((listing: MarketListing) => <article key={listing.id} className="marketplace-review-card"><div className="marketplace-review-heading"><div><span className="landing-kicker">{listing.category} · {listing.condition.replaceAll("_", " ")}</span><h2>{listing.title}</h2></div><strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(listing.priceKobo / 100)}</strong></div><p>{listing.description}</p><div className="marketplace-review-meta"><span>{listing.seller.displayName || "Unnamed seller"}</span><span>{listing.area.name}, {listing.city.name}</span></div><div className="marketplace-review-actions"><button className="button button-primary" disabled={review.isPending} onClick={() => review.mutate({ id: listing.id, status: "PUBLISHED" })}>Approve</button><button className="button button-danger" disabled={review.isPending} onClick={() => review.mutate({ id: listing.id, status: "REJECTED" })}>Reject</button></div></article>)}</div> : <section className="public-empty-state"><AppIcon name="check"/><h2>No pending listings</h2></section>}</main>;
}
