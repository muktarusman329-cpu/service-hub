"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { MarketListing, MarketListingCategory, MarketListingCondition } from "@servicehub/shared/api-client";
import { authFetch } from "@/lib/auth-client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
type Area = { id: string; name: string };
type CityResponse = { city: { id: string } };
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
  PUBLISHED: "Live",
  REJECTED: "Needs changes",
  SOLD: "Sold",
};

export function MarketplaceSellerWorkspace() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [areaId, setAreaId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketListingCategory>("clothing");
  const [condition, setCondition] = useState<MarketListingCondition>("GOOD");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`${API}/catalog/minna/categories`, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Minna marketplace setup is unavailable.");
        return response.json() as Promise<CityResponse>;
      }),
      fetch(`${API}/catalog/minna/areas`, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error("Service areas could not be loaded.");
        return response.json() as Promise<Area[]>;
      }),
      authFetch("/marketplace/mine/listings").then((items) => items as MarketListing[]),
    ]).then(([, areaRows, myListings]) => {
      if (!active) return;
      setAreas(areaRows);
      setAreaId(areaRows[0]?.id ?? "");
      setListings(myListings);
      setSignedIn(true);
    }).catch((cause: unknown) => {
      if (!active) return;
      const reason = cause instanceof Error ? cause.message : "Marketplace setup could not be loaded.";
      if (/sign in|unauthori[sz]ed/i.test(reason)) {
        setSignedIn(false);
      } else {
        setError(reason);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const cityResponse = await fetch(`${API}/catalog/minna/categories`, { cache: "no-store" });
      if (!cityResponse.ok) throw new Error("Minna marketplace setup is unavailable.");
      const city = await cityResponse.json() as CityResponse;
      const listing = await authFetch("/marketplace/mine/listings", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          condition,
          priceKobo: Math.round(Number(price) * 100),
          cityId: city.city.id,
          areaId,
        }),
      }) as MarketListing;
      setListings((existing) => [listing, ...existing]);
      setTitle("");
      setDescription("");
      setPrice("");
      setMessage("Your listing has been sent for review. We’ll publish it once it is approved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your listing could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  async function markSold(id: string) {
    setError("");
    try {
      const updated = await authFetch(`/marketplace/mine/listings/${id}/sold`, { method: "PATCH", body: JSON.stringify({}) }) as MarketListing;
      setListings((existing) => existing.map((listing) => listing.id === id ? updated : listing));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This listing could not be updated.");
    }
  }

  if (loading) return <div className="marketplace-state" role="status">Loading your seller workspace…</div>;
  if (!signedIn) return (
    <section className="marketplace-sell-signin">
      <span className="landing-kicker">SELL ON THE MINNA MARKETPLACE</span>
      <h1>A good find starts with a good seller.</h1>
      <p>Sign in to list your item and keep track of its review status.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Link href="/sign-in?next=%2Fmarketplace%2Fsell" className="button button-primary">Sign in to continue</Link>
    </section>
  );

  return (
    <div className="marketplace-seller-layout">
      <section className="marketplace-seller-intro">
        <span className="landing-kicker">SELL ON SERVICEHUB</span>
        <h1>Pass a good find along.</h1>
        <p>List quality pre-loved items for people around Minna. Every listing is reviewed before it appears in the market.</p>
        <div className="marketplace-seller-points"><span>✓ Free to list in this preview</span><span>✓ Meet buyers locally</span><span>✓ You control when an item is sold</span></div>
      </section>
      <div className="marketplace-seller-form-layout">
        <form className="marketplace-seller-form" onSubmit={submit}>
          <div><span className="landing-kicker">ITEM DETAILS</span><h2>Create a listing</h2><p>Be clear and honest about the item’s condition.</p></div>
          <label>Item name<input className="input" required minLength={4} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Study desk in good condition" /></label>
          <div className="marketplace-form-row">
            <label>Category<select className="input" value={category} onChange={(event) => setCategory(event.target.value as MarketListingCategory)}>{categoryChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
            <label>Condition<select className="input" value={condition} onChange={(event) => setCondition(event.target.value as MarketListingCondition)}>{conditionChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
          </div>
          <div className="marketplace-form-row">
            <label>Price (₦)<input className="input" type="number" inputMode="numeric" min="1" max="20000000" step="1" required value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 15000" /></label>
            <label>Area in Minna<select className="input" required value={areaId} onChange={(event) => setAreaId(event.target.value)}>{areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
          <label>Description<textarea className="input marketplace-description-input" required minLength={20} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the item, its condition, size or anything a buyer should know." /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button type="submit" className="button button-primary" disabled={busy || !areas.length}>{busy ? "Sending for review…" : "Submit listing for review"}</button>
          <p className="marketplace-form-note">No payment is collected. Arrange item checks and payment directly with the buyer.</p>
        </form>
        <aside className="marketplace-seller-side">
          <div className="marketplace-seller-tip"><span aria-hidden="true">✦</span><h3>Make your listing shine</h3><p>Use a specific title, pick the right condition, and mention wear or missing parts in your description.</p></div>
          <div className="marketplace-my-listings">
            <span className="landing-kicker">YOUR ITEMS</span><h2>Your listings</h2>
            {listings.length ? listings.map((listing) => (
              <div key={listing.id} className="marketplace-my-listing">
                <div><strong>{listing.title}</strong><span>{statusLabels[listing.status]}</span></div>
                {listing.status === "PUBLISHED" && <button type="button" className="button button-secondary" onClick={() => void markSold(listing.id)}>Mark sold</button>}
                {listing.moderationNote && <p>{listing.moderationNote}</p>}
              </div>
            )) : <p className="marketplace-form-note">Your submitted items will appear here with their review status.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
