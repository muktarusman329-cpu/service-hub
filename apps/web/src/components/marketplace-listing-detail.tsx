"use client";

import Link from "next/link";
import type { MarketListing } from "@servicehub/shared/api-client";
import { useMarketplaceListing, useMarkMarketplaceListingSold } from "@servicehub/shared/hooks/use-marketplace";

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

function formatPrice(priceKobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(priceKobo / 100);
}

export function MarketplaceListingDetail({ id }: { id: string }) {
  const { data: listing, isLoading, isError, error, refetch } = useMarketplaceListing(id);
  const markSold = useMarkMarketplaceListingSold();

  if (isLoading) return <div className="marketplace-state" role="status">Loading this find…</div>;
  if (isError || !listing) return (
    <div className="marketplace-state marketplace-state-error" role="alert">
      <strong>This listing isn’t available.</strong><span>{error instanceof Error ? error.message : "It may have sold or been removed."}</span>
      <button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button>
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
          <div className="marketplace-detail-price">{formatPrice(listing.priceKobo)}</div>
          <div className="marketplace-detail-tags"><span>{conditionLabels[listing.condition]}</span><span>{listing.area.name}, {listing.city.name}</span></div>
          <div className="marketplace-detail-rule" />
          <h2>About this item</h2>
          <p className="marketplace-detail-description">{listing.description}</p>
          <div className="marketplace-seller-card">
            <span className="marketplace-seller-avatar" aria-hidden="true">{(listing.seller.displayName || "Seller").slice(0, 1).toUpperCase()}</span>
            <div><span className="landing-kicker">LISTED BY</span><strong>{listing.seller.displayName || "ServiceHub seller"}</strong><span>{listing.area.name}, {listing.city.name}</span></div>
          </div>
          {listing.seller.id === "seller-fatima" && (
            <div className="marketplace-detail-actions">
              <button type="button" className="button button-secondary" disabled={markSold.isPending} onClick={() => markSold.mutate(listing.id)}>
                {markSold.isPending ? "Updating…" : "Mark my item sold"}
              </button>
              {markSold.isError && <p className="form-error" role="alert">{markSold.error.message}</p>}
              {markSold.isSuccess && <p className="form-success" role="status">Marked sold. It is no longer visible in public search.</p>}
            </div>
          )}
          <div className="marketplace-detail-actions">
            <Link href={`/sign-in?next=${encodeURIComponent(`/marketplace/${listing.id}`)}`} className="button button-primary">Sign in to enquire</Link>
            <p>Meet locally and check the item before agreeing to buy. ServiceHub does not process payment for marketplace items.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
