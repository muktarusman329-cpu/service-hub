"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { MarketListing, MarketListingCategory, MarketListingCondition } from "@servicehub/shared/api-client";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { useCreateMarketplaceListing, useMarkMarketplaceListingSold, useMyMarketplaceListings } from "@servicehub/shared/hooks/use-marketplace";

const categoryChoices: Array<{ value: MarketListingCategory; label: string }> = [
  { value: "clothing", label: "Clothing & style" },
  { value: "home-goods", label: "Home & kitchen" },
  { value: "electronics", label: "Electronics" },
  { value: "books", label: "Books & study" },
  { value: "furniture", label: "Furniture" },
  { value: "other", label: "Other finds" },
];
const conditionChoices: Array<{ value: MarketListingCondition; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
];
const statusLabels: Record<MarketListing["status"], string> = {
  PENDING_REVIEW: "Pending review",
  PUBLISHED: "Approved and live",
  REJECTED: "Rejected · needs changes",
  SOLD: "Sold",
};

export function MarketplaceSellerWorkspace() {
  const { data: listings = [], isLoading, isError, error, refetch } = useMyMarketplaceListings();
  const createListing = useCreateMarketplaceListing();
  const markSold = useMarkMarketplaceListingSold();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketListingCategory>("clothing");
  const [condition, setCondition] = useState<MarketListingCondition>("GOOD");
  const [price, setPrice] = useState("");
  const [areaName, setAreaName] = useState<string>(minnaAreas[0]?.name ?? "");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    createListing.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      condition,
      priceKobo: Math.round(Number(price) * 100),
      areaName,
    }, {
      onSuccess: () => {
        setTitle("");
        setDescription("");
        setPrice("");
        setMessage("Your item is pending review. It will appear in the market after approval.");
      },
    });
  }

  return (
    <div className="marketplace-seller-layout">
      <section className="marketplace-seller-intro">
        <span className="landing-kicker">SELL ON SERVICEHUB</span>
        <h1>Pass a good find along.</h1>
        <p>List quality pre-loved items for people around Minna. Every listing is reviewed before it appears in the market.</p>
        <div className="marketplace-seller-points"><span>✓ Free to list in this preview</span><span>✓ Meet buyers locally</span><span>✓ You control when an item is sold</span></div>
      </section>
      <div className="marketplace-seller-form-layout">
        <form className="marketplace-seller-form" onSubmit={(event) => void submit(event)}>
          <div><span className="landing-kicker">ITEM DETAILS</span><h2>Create a listing</h2><p>Be clear and honest about the item’s condition.</p></div>
          <label>Item name<input className="input" required minLength={4} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Study desk in good condition" /></label>
          <div className="marketplace-form-row">
            <label>Category<select className="input" value={category} onChange={(event) => setCategory(event.target.value as MarketListingCategory)}>{categoryChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
            <label>Condition<select className="input" value={condition} onChange={(event) => setCondition(event.target.value as MarketListingCondition)}>{conditionChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
          </div>
          <div className="marketplace-form-row">
            <label>Price (₦)<input className="input" type="number" inputMode="numeric" min="1" max="20000000" step="1" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 15000" /></label>
            <label>Area in Minna<select className="input" required value={areaName} onChange={(event) => setAreaName(event.target.value)}>{minnaAreas.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          </div>
          <label>Description<textarea className="input marketplace-description-input" required minLength={20} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the item, its condition, size or anything a buyer should know." /></label>
          {createListing.isError && <p className="form-error" role="alert">{createListing.error.message}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button type="submit" className="button button-primary" disabled={createListing.isPending || !areaName}>{createListing.isPending ? "Sending for review…" : "Submit listing for review"}</button>
          <p className="marketplace-form-note">Demo listing only. No payment is collected.</p>
        </form>
        <aside className="marketplace-seller-side">
          <div className="marketplace-seller-tip"><span aria-hidden="true">✦</span><h3>Make your listing shine</h3><p>Use a specific title, pick the right condition, and mention wear or missing parts in your description.</p></div>
          <div className="marketplace-my-listings">
            <span className="landing-kicker">YOUR ITEMS · MOCK SELLER: FATIMA SANI</span><h2>Your listings</h2>
            {isLoading ? <p className="marketplace-state" role="status">Loading your listings…</p>
              : isError ? <div className="marketplace-state marketplace-state-error" role="alert"><p>{error.message}</p><button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button></div>
                : listings.length ? listings.map((listing) => (
                  <div key={listing.id} className="marketplace-my-listing">
                    <div><strong>{listing.title}</strong><span>{statusLabels[listing.status]}</span></div>
                    {listing.status === "PUBLISHED" && <button type="button" className="button button-secondary" disabled={markSold.isPending} onClick={() => markSold.mutate(listing.id)}>{markSold.isPending ? "Updating…" : "Mark sold"}</button>}
                    {listing.moderationNote && <p>{listing.moderationNote}</p>}
                    {markSold.isError && <p className="form-error" role="alert">{markSold.error.message}</p>}
                  </div>
                )) : <p className="marketplace-form-note">No listings yet. Submit an item to see it here.</p>}
            <Link href="/marketplace" className="marketplace-text-link">Browse approved listings →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
