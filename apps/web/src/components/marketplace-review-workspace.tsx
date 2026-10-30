"use client";

import type { MarketListing } from "@servicehub/shared/api-client";
import { useMarketplaceListings, useReviewMarketplaceListing } from "@servicehub/shared/hooks/use-marketplace";

export function MarketplaceReviewWorkspace() {
  const { data: listings = [], isLoading, isError, error, refetch } = useMarketplaceListings({ status: "PENDING_REVIEW" });
  const review = useReviewMarketplaceListing();

  return (
    <main className="content">
      <div className="page-heading"><div><div className="eyebrow">ADMIN · MARKETPLACE · MOCK MODERATOR</div><h1>Review marketplace listings</h1><p className="subtle">Approve suitable items before they are visible to buyers.</p></div></div>
      {review.isError && <p className="form-error" role="alert">{review.error.message}</p>}
      {isLoading ? <p className="subtle" role="status">Loading submissions…</p>
        : isError ? <section className="marketplace-state marketplace-state-error" role="alert"><p>{error.message}</p><button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button></section>
          : listings.length ? <div className="marketplace-review-list">{listings.map((listing: MarketListing) => (
            <article key={listing.id} className="marketplace-review-card">
              <div className="marketplace-review-heading"><div><span className="landing-kicker">{listing.category} · {listing.condition.replaceAll("_", " ")}</span><h2>{listing.title}</h2></div><strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(listing.priceKobo / 100)}</strong></div>
              <p>{listing.description}</p>
              <div className="marketplace-review-meta"><span>Seller: {listing.seller.displayName || "Unnamed seller"}</span><span>{listing.area.name}, {listing.city.name}</span><span>Submitted {new Date(listing.createdAt).toLocaleDateString("en-NG")}</span></div>
              <div className="marketplace-review-actions">
                <button type="button" className="button button-primary" disabled={review.isPending} onClick={() => review.mutate({ id: listing.id, status: "PUBLISHED" })}>{review.isPending ? "Saving…" : "Approve and publish"}</button>
                <button type="button" className="button button-danger" disabled={review.isPending} onClick={() => review.mutate({ id: listing.id, status: "REJECTED" })}>Reject listing</button>
              </div>
            </article>
          ))}</div>
            : <section className="public-empty-state"><span className="public-empty-icon" aria-hidden="true">✓</span><h2>All caught up</h2><p>No listings are waiting for review. Approved listings show on the public marketplace.</p></section>}
    </main>
  );
}
