"use client";

import Link from "next/link";
import type { MarketListing } from "@servicehub/shared/api-client";
import { useCreateMarketplaceOrder, useMarketplaceListing, useMarkMarketplaceListingSold, useToggleSavedMarketplaceListing } from "@servicehub/shared/hooks/use-marketplace";
import { AppIcon, type AppIconName } from "@/components/app-icon";

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
const categoryIcons: Record<MarketListing["category"], AppIconName> = {
  clothing: "shirt",
  "home-goods": "home",
  electronics: "smartphone",
  books: "book-open",
  furniture: "armchair",
  other: "package",
};

function formatPrice(priceKobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(priceKobo / 100);
}

export function MarketplaceListingDetail({ id }: { id: string }) {
  const { data: listing, isLoading, isError, error, refetch } = useMarketplaceListing(id);
  const markSold = useMarkMarketplaceListingSold();
  const createOrder = useCreateMarketplaceOrder();
  const toggleSaved = useToggleSavedMarketplaceListing();

  if (isLoading) return <div className="marketplace-state" role="status">Loading this find…</div>;
  if (isError) return (
    <div className="marketplace-state marketplace-state-error" role="alert">
      <strong>This listing couldn’t be loaded.</strong><span>{error instanceof Error ? error.message : "Check your connection and try again."}</span>
      <button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button>
      <Link href="/marketplace" className="button button-secondary">Back to the marketplace</Link>
    </div>
  );
  if (!listing) return <div className="marketplace-state marketplace-empty"><h2>This item is not available.</h2><p>It may have sold or been removed. Browse other finds around Minna.</p><Link className="button button-primary" href="/marketplace">Browse the marketplace</Link></div>;

  return (
    <div className="marketplace-detail">
      <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/marketplace">Marketplace</Link><span>/</span><span aria-current="page">{listing.title}</span></nav>
      <div className="marketplace-detail-layout">
        <div className={`marketplace-detail-art marketplace-art-${listing.category}`} role="img" aria-label={`${listing.title} photo placeholder`} />
        <article className="marketplace-detail-info">
          <div className="marketplace-category-label"><AppIcon name={categoryIcons[listing.category]} size={16} />{categoryLabels[listing.category]}</div>
          <h1>{listing.title}</h1>
          <div className="marketplace-detail-price">{formatPrice(listing.priceKobo)}</div>
          <div className="marketplace-detail-tags"><span>{conditionLabels[listing.condition]}</span><span>{listing.area.name}, {listing.city.name}</span></div>
          <div className="marketplace-detail-rule" />
          <h2>About this item</h2>
          <p className="marketplace-detail-description">{listing.description}</p>
          <div className="marketplace-seller-card">
            <span className="marketplace-seller-avatar" aria-hidden="true">{(listing.seller.displayName || "Seller").slice(0, 1).toUpperCase()}</span>
            <div><Link href={`/marketplace/sellers/${listing.seller.id}`}><strong>{listing.seller.displayName || "ServiceHub seller"}</strong></Link><span>{listing.area.name}, {listing.city.name}</span></div>
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
            <button type="button" className="button button-secondary" disabled={toggleSaved.isPending} onClick={() => toggleSaved.mutate(listing.id)}>
              {toggleSaved.data ? "Saved" : "Save item"}
            </button>
            {listing.seller.id !== "seller-fatima" && <button type="button" className="button button-primary" disabled={createOrder.isPending} onClick={() => createOrder.mutate(listing.id)}>
              {createOrder.isPending ? "Sending request…" : "Request to buy"}
            </button>}
            {createOrder.isSuccess && <p className="form-success" role="status">Request sent. Follow updates in your marketplace orders.</p>}
            {(createOrder.isError || toggleSaved.isError) && <p className="form-error" role="alert">{createOrder.error?.message ?? toggleSaved.error?.message}</p>}
            <Link href="/marketplace/orders" className="marketplace-text-link">View marketplace orders</Link>
            <p>Meet locally and check the item before agreeing to buy. ServiceHub does not process payment for marketplace items.</p>
          </div>
        </article>
      </div>
    </div>
  );
}
