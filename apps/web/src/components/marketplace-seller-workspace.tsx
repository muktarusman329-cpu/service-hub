"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import type { MarketListing, MarketListingCategory, MarketListingCondition } from "@servicehub/shared/api-client";
import { useCatalog } from "@servicehub/shared/hooks/use-catalog";
import { useCreateMarketplaceListing, useMarkMarketplaceListingSold, useMyMarketplaceListings } from "@servicehub/shared/hooks/use-marketplace";

const categoryChoices: Array<{ value: MarketListingCategory; label: string }> = [
  { value: "clothing", label: "Clothing & style" }, { value: "home-goods", label: "Home & kitchen" }, { value: "electronics", label: "Electronics" }, { value: "books", label: "Books & study" }, { value: "furniture", label: "Furniture" }, { value: "other", label: "Other finds" },
];
const conditionChoices: Array<{ value: MarketListingCondition; label: string }> = [{ value: "NEW", label: "New" }, { value: "LIKE_NEW", label: "Like new" }, { value: "GOOD", label: "Good" }, { value: "FAIR", label: "Fair" }];
const statusLabels: Record<MarketListing["status"], string> = { PENDING_REVIEW: "Pending review", PUBLISHED: "Approved and live", REJECTED: "Rejected · needs changes", SOLD: "Sold" };

export function MarketplaceSellerWorkspace() {
  const catalog = useCatalog();
  const { data: listings = [], isLoading, isError, error, refetch } = useMyMarketplaceListings();
  const createListing = useCreateMarketplaceListing();
  const markSold = useMarkMarketplaceListingSold();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketListingCategory>("clothing");
  const [condition, setCondition] = useState<MarketListingCondition>("GOOD");
  const [price, setPrice] = useState("");
  const [areaId, setAreaId] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    if (!catalog.data?.city.id || !areaId) return;
    try {
      await createListing.mutateAsync({ title: title.trim(), description: description.trim(), category, condition, priceKobo: Math.round(Number(price) * 100), cityId: catalog.data.city.id, areaId });
      setTitle(""); setDescription(""); setPrice(""); setMessage("Your listing was submitted for review.");
    } catch { /* mutation error is rendered below */ }
  }

  const saving = createListing.isPending;
  return <div className="marketplace-seller-layout"><section className="marketplace-seller-intro"><span className="landing-kicker">SELL ON SERVICEHUB</span><h1>List an item</h1><p>Submit a listing for review. Published listings become visible in the marketplace.</p><div className="marketplace-seller-points"><span><AppIcon name="check" size={16} /> Local listings</span><span><AppIcon name="check" size={16} /> Reviewed before publishing</span></div></section><div className="marketplace-seller-form-layout"><form className="marketplace-seller-form" onSubmit={(event) => void submit(event)}><div><span className="landing-kicker">ITEM DETAILS</span><h2>Create a listing</h2></div><label>Item name<input className="input" required minLength={4} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label><div className="marketplace-form-row"><label>Category<select className="input" value={category} onChange={(event) => setCategory(event.target.value as MarketListingCategory)}>{categoryChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label><label>Condition<select className="input" value={condition} onChange={(event) => setCondition(event.target.value as MarketListingCondition)}>{conditionChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label></div><div className="marketplace-form-row"><label>Price (₦)<input className="input" type="number" min="1" required value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Area<select className="input" required value={areaId} onChange={(event) => setAreaId(event.target.value)} disabled={catalog.isLoading || catalog.isError}>{catalog.data?.areas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label>Description<textarea className="input marketplace-description-input" required minLength={20} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>{catalog.isError && <p className="form-error" role="alert">{catalog.error.message}</p>}{(createListing.isError) && <p className="form-error" role="alert">{createListing.error.message}</p>}{message && <p className="form-success" role="status">{message}</p>}<button type="submit" className="button button-primary" disabled={saving || !areaId}>{saving ? "Submitting…" : "Submit listing for review"}</button></form><aside className="marketplace-seller-side"><div className="marketplace-my-listings"><h2>Your listings</h2>{isLoading ? <p role="status">Loading your listings…</p> : isError ? <div role="alert"><p>{error.message}</p><button type="button" className="button button-secondary" onClick={() => void refetch()}>Try again</button></div> : listings.length ? listings.map((listing) => <div key={listing.id} className="marketplace-my-listing"><div><strong>{listing.title}</strong><span>{statusLabels[listing.status]}</span></div>{listing.status === "PUBLISHED" && <button type="button" className="button button-secondary" disabled={markSold.isPending} onClick={() => markSold.mutate(listing.id)}>Mark sold</button>}{listing.moderationNote && <p>{listing.moderationNote}</p>}</div>) : <p>No listings yet.</p>}<Link href="/marketplace" className="marketplace-text-link">Browse published listings <AppIcon name="arrow-right" size={16} /></Link></div></aside></div></div>;
}
