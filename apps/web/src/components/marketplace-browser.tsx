"use client";

import Link from "next/link";
import { useState } from "react";
import type { MarketListing, MarketListingCategory } from "@servicehub/shared/api-client";
import { useMarketplaceListings } from "@servicehub/shared/hooks/use-marketplace";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppPhoto, marketplacePhotoUrl } from "@/components/app-photo";
import { messages } from "@servicehub/shared/messages/en";

const categories: Array<{ value: MarketListingCategory | ""; label: string }> = [
  { value: "", label: messages.marketplace.everything },
  { value: "clothing", label: messages.marketplace.clothing },
  { value: "home-goods", label: messages.marketplace.homeGoods },
  { value: "electronics", label: messages.marketplace.electronics },
  { value: "books", label: messages.marketplace.books },
  { value: "furniture", label: messages.marketplace.furniture },
  { value: "other", label: messages.marketplace.other },
];

const categoryIcons: Record<MarketListingCategory, AppIconName> = {
  clothing: "shirt",
  "home-goods": "home",
  electronics: "smartphone",
  books: "book-open",
  furniture: "armchair",
  other: "package",
};

const conditions: Record<MarketListing["condition"], string> = {
  NEW: messages.marketplace.new,
  LIKE_NEW: messages.marketplace.likeNew,
  GOOD: messages.marketplace.good,
  FAIR: messages.marketplace.fair,
};

function formatPrice(priceKobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(priceKobo / 100);
}

export function MarketplaceBrowser({ initialQuery = "" }: { initialQuery?: string }) {
  const [category, setCategory] = useState<MarketListingCategory | "">("");
  const [search, setSearch] = useState(initialQuery);
  const { data: listings = [], isLoading, isError, error, refetch } = useMarketplaceListings({
    ...(category ? { category } : {}),
    ...(search.trim() ? { query: search.trim() } : {}),
  });


  return (
    <>
      <section className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <h1>{messages.marketplace.heroTitle}</h1>
          <p>{messages.marketplace.heroSubtitle}</p>
          <div className="marketplace-hero-actions">
            <a href="#marketplace-listings" className="button button-primary">{messages.marketplace.explore}</a>
            <Link href="/marketplace/sell" className="marketplace-text-link">{messages.marketplace.haveToSell} {messages.marketplace.listHere}</Link>
          </div>
          <nav className="marketplace-quick-links" aria-label="Marketplace account links"><Link href="/marketplace/saved">Saved items</Link><Link href="/marketplace/orders">Your orders</Link><Link href="/marketplace/sell">Your listings</Link></nav>
        </div>
      </section>

      <section className="marketplace-categories" aria-label="Shop by category">
        {categories.slice(1).map((item) => (
          <button key={item.value} type="button" className={`marketplace-category-chip ${category === item.value ? "active" : ""}`} onClick={() => setCategory(category === item.value ? "" : item.value)}>
            <AppIcon name={categoryIcons[item.value as MarketListingCategory]} size={16} />{item.label}
          </button>
        ))}
      </section>

      <section id="marketplace-listings" className="marketplace-listings-section">
        <div className="marketplace-section-heading">
          <div><h2>{messages.marketplace.findYourNext}</h2></div>
          <label className="marketplace-search"><span className="sr-only">Search listings</span><AppIcon name="search" size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={messages.marketplace.searchPlaceholder} /></label>
        </div>
        {isLoading ? <div className="marketplace-state" role="status">{messages.marketplace.loadingListings}</div>
          : isError ? <div className="marketplace-state marketplace-state-error" role="alert"><strong>Marketplace is unavailable right now.</strong><span>{error instanceof Error ? error.message : "Listings could not be loaded."}</span><button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button></div>
            : listings.length ? (
              <div className="marketplace-listing-grid">
                {listings.map((listing) => (
                  <article key={listing.id} className="marketplace-listing-card">
                    <Link href={`/marketplace/${listing.id}`} className="marketplace-listing-card-link">
                      <AppPhoto src={marketplacePhotoUrl(listing.category)} alt="" className="marketplace-listing-art" sizes="(max-width: 800px) 50vw, 25vw" />
                      <span className="marketplace-listing-condition">{conditions[listing.condition]}</span>
                      <span className="marketplace-listing-category">{categories.find((item) => item.value === listing.category)?.label}</span>
                      <h3>{listing.title}</h3>
                      <span className="marketplace-listing-price">{formatPrice(listing.priceKobo)}</span>
                      <span className="marketplace-listing-meta">{listing.area.name} · {listing.city.name}</span>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="marketplace-state marketplace-empty">
                <AppIcon name="search" /><h3>{messages.marketplace.justStarted}</h3>
                <p>{messages.marketplace.noListings}</p>
                <Link href="/marketplace/sell" className="button button-primary">{messages.marketplace.listFirst}</Link>
              </div>
            )}
      </section>

      <section className="marketplace-promo">
        <div className="marketplace-promo-icon"><AppIcon name="recycle" /></div>
        <div><h2>{messages.marketplace.purposeTitle}</h2><p>{messages.marketplace.purposeDesc}</p></div>
        <Link href="/marketplace/sell" className="button button-secondary">{messages.marketplace.sellSomething}</Link>
      </section>
    </>
  );
}
