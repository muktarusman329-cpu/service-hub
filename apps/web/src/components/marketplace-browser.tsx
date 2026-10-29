"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MarketListing, MarketListingCategory } from "@servicehub/shared/api-client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const categories: Array<{ value: MarketListingCategory | ""; label: string }> = [
  { value: "", label: "Everything" },
  { value: "clothing", label: "Clothing & style" },
  { value: "home-goods", label: "Home & kitchen" },
  { value: "electronics", label: "Electronics" },
  { value: "books", label: "Books & study" },
  { value: "furniture", label: "Furniture" },
  { value: "other", label: "Other finds" },
];

const illustrations: Record<MarketListingCategory, string> = {
  clothing: "✳",
  "home-goods": "⌂",
  electronics: "▣",
  books: "▤",
  furniture: "▱",
  other: "✦",
};

const conditions: Record<MarketListing["condition"], string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
};

function formatPrice(priceKobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(priceKobo / 100);
}

export function MarketplaceBrowser() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [category, setCategory] = useState<MarketListingCategory | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ city: "minna" });
    if (category) params.set("category", category);
    if (search.trim()) params.set("q", search.trim());
    setLoading(true);
    setError("");

    void fetch(`${API}/marketplace/listings?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Marketplace listings could not be loaded.");
        return body as { items: MarketListing[] };
      })
      .then((body) => setListings(body.items))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Marketplace listings could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [category, search]);

  return (
    <>
      <section className="marketplace-hero">
        <div className="marketplace-hero-copy">
          <span className="landing-kicker">THE MINNA MARKETPLACE</span>
          <h1>Good finds deserve a second home.</h1>
          <p>Discover pre-loved clothes, home essentials, books and more from people around Minna.</p>
          <div className="marketplace-hero-actions">
            <a href="#marketplace-listings" className="button button-primary">Explore the market <span aria-hidden="true">↓</span></a>
            <Link href="/marketplace/sell" className="marketplace-text-link">Have something to sell? <span>List it here →</span></Link>
          </div>
          <div className="marketplace-trust-note"><span aria-hidden="true">✓</span> Local finds · Reuse more · Connect directly</div>
        </div>
        <div className="marketplace-hero-art" aria-hidden="true">
          <div className="marketplace-art-circle marketplace-art-circle-one" />
          <div className="marketplace-art-circle marketplace-art-circle-two" />
          <div className="marketplace-art-tag">GOOD FINDS<br />GOOD FOR MINNA</div>
          <div className="marketplace-art-item marketplace-art-item-one">✳</div>
          <div className="marketplace-art-item marketplace-art-item-two">▤</div>
          <div className="marketplace-art-item marketplace-art-item-three">⌂</div>
          <span className="marketplace-art-caption">Pass it on. Find your next favourite.</span>
        </div>
      </section>

      <section className="marketplace-categories" aria-label="Shop by category">
        {categories.slice(1).map((item) => (
          <button key={item.value} type="button" className={`marketplace-category-chip ${category === item.value ? "active" : ""}`} onClick={() => setCategory(category === item.value ? "" : item.value)}>
            <span aria-hidden="true">{illustrations[item.value as MarketListingCategory]}</span>{item.label}
          </button>
        ))}
      </section>

      <section id="marketplace-listings" className="marketplace-listings-section">
        <div className="marketplace-section-heading">
          <div><span className="landing-kicker">SHOP LOCAL, GIVE THINGS ANOTHER LIFE</span><h2>Find your next good thing</h2></div>
          <label className="marketplace-search"><span className="sr-only">Search listings</span><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the market" /></label>
        </div>
        {loading ? <div className="marketplace-state" role="status">Finding good things in Minna…</div>
          : error ? <div className="marketplace-state marketplace-state-error" role="alert"><strong>Marketplace is unavailable right now.</strong><span>{error}</span><span>Check the ServiceHub API is running, then refresh this page.</span></div>
            : listings.length ? (
              <div className="marketplace-listing-grid">
                {listings.map((listing) => (
                  <Link key={listing.id} href={`/marketplace/${listing.id}`} className="marketplace-listing-card">
                    <span className={`marketplace-listing-art marketplace-art-${listing.category}`} aria-hidden="true">{illustrations[listing.category]}</span>
                    <span className="marketplace-listing-condition">{conditions[listing.condition]}</span>
                    <span className="marketplace-listing-category">{categories.find((item) => item.value === listing.category)?.label}</span>
                    <h3>{listing.title}</h3>
                    <span className="marketplace-listing-price">{formatPrice(listing.priceKobo)}</span>
                    <span className="marketplace-listing-meta">{listing.area.name} · {listing.city.name}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="marketplace-state marketplace-empty">
                <span aria-hidden="true">✳</span><h3>The market is just getting started.</h3>
                <p>Be among the first to share a good find with Minna.</p>
                <Link href="/marketplace/sell" className="button button-primary">List your first item</Link>
              </div>
            )}
      </section>

      <section className="marketplace-promo">
        <div className="marketplace-promo-icon" aria-hidden="true">↻</div>
        <div><span className="landing-kicker">THRIFT WITH PURPOSE</span><h2>Better finds. Less waste. More community.</h2><p>Give useful items a second life and help keep good things moving around Minna.</p></div>
        <Link href="/marketplace/sell" className="button button-secondary">Sell something you love</Link>
      </section>
    </>
  );
}
