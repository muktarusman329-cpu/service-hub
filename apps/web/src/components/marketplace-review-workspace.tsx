"use client";

import { useEffect, useState } from "react";
import type { MarketListing } from "@servicehub/shared/api-client";
import { authFetch } from "@/lib/auth-client";

export function MarketplaceReviewWorkspace() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void authFetch("/admin/marketplace/pending").then((items) => {
      if (active) setListings(items as MarketListing[]);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Pending marketplace listings could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(id: string, status: "PUBLISHED" | "REJECTED") {
    setError("");
    try {
      await authFetch(`/admin/marketplace/listings/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setListings((existing) => existing.filter((listing) => listing.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This listing could not be reviewed.");
    }
  }

  return (
    <main className="content">
      <div className="page-heading"><div><div className="eyebrow">ADMIN · MARKETPLACE</div><h1>Review marketplace listings</h1><p className="subtle">Approve suitable items before they are visible to buyers.</p></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="subtle">Loading submissions…</p>
        : listings.length ? <div className="marketplace-review-list">{listings.map((listing) => (
          <article key={listing.id} className="marketplace-review-card">
            <div className="marketplace-review-heading"><div><span className="landing-kicker">{listing.category} · {listing.condition.replaceAll("_", " ")}</span><h2>{listing.title}</h2></div><strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(listing.priceKobo / 100)}</strong></div>
            <p>{listing.description}</p>
            <div className="marketplace-review-meta"><span>Seller: {listing.seller.displayName || "Unnamed seller"}</span><span>{listing.area.name}, {listing.city.name}</span><span>Submitted {new Date(listing.createdAt).toLocaleDateString("en-NG")}</span></div>
            <div className="marketplace-review-actions"><button type="button" className="button button-primary" onClick={() => void review(listing.id, "PUBLISHED")}>Approve and publish</button><button type="button" className="button button-danger" onClick={() => void review(listing.id, "REJECTED")}>Reject listing</button></div>
          </article>
        ))}</div>
          : <section className="public-empty-state"><span className="public-empty-icon" aria-hidden="true">✓</span><h2>All caught up</h2><p>There are no marketplace listings waiting for review.</p></section>}
    </main>
  );
}
