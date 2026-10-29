"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketListing } from "@servicehub/shared/api-client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const categoryLabels: Record<MarketListing["category"], string> = {
  clothing: "Clothing & style",
  "home-goods": "Home & kitchen",
  electronics: "Electronics",
  books: "Books & study",
  furniture: "Furniture",
  other: "Other finds",
};
const conditionLabels: Record<MarketListing["condition"], string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};
const categoryArt: Record<MarketListing["category"], string> = {
  clothing: "✳",
  "home-goods": "⌂",
  electronics: "▣",
  books: "▤",
  furniture: "▱",
  other: "✦",
};

export function MarketplaceListingDetail({ id }: { id: string }) {
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${API}/marketplace/listings/${encodeURIComponent(id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "This listing could not be loaded.");
        return body as MarketListing;
      })
      .then(setListing)
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "This listing could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  if (loading) return <div className="marketplace-state" role="status">Loading this find…</div>;
  if (error || !listing) return (
    <div className="marketplace-state marketplace-state-error" role="alert">
      <strong>This listing isn’t available.</strong><span>{error || "It may have sold or been removed."}</span>
      <Link href="/marketplace" className="button button-secondary">Back to the marketplace</Link>
    </div>
  );

  return (
    <div className="marketplace-detail">
      <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/marketplace">Marketplace</Link><span>/</span><span aria-current="page">{listing.title}</span></nav>
      <div className="marketplace-detail-layout">
        <div className={`marketplace-detail-art marketplace-art-${listing.category}`} aria-hidden="true">{categoryArt[listing.category]}</div>
        <article className="marketplace-detail-info">
          <span className="landing-kicker">{categoryLabels[listing.category]}</span>
          <h1>{listing.title}</h1>
          <div className="marketplace-detail-price">{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(listing.priceKobo / 100)}</div>
          <div className="marketplace-detail-tags"><span>{conditionLabels[listing.condition]}</span><span>{listing.area.name}, {listing.city.name}</span></div>
          <div className="marketplace-detail-rule" />
          <h2>About this item</h2>
          <p className="marketplace-detail-description">{listing.description}</p>
          <div className="marketplace-seller-card">
            <span className="marketplace-seller-avatar" aria-hidden="true">{(listing.seller.displayName || "Seller").slice(0, 1).toUpperCase()}</span>
            <div><span className="landing-kicker">LISTED BY</span><strong>{listing.seller.displayName || "ServiceHub seller"}</strong><span>{listing.area.name}, {listing.city.name}</span></div>
          </div>
          <div className="marketplace-detail-actions">
            <Link href={`/sign-in?next=${encodeURIComponent(`/marketplace/${listing.id}`)}`} className="button button-primary">Sign in to enquire</Link>
            <p>Meet locally and check the item before agreeing to buy. ServiceHub does not process payment for marketplace items.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
