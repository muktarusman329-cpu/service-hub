"use client";

import Link from "next/link";
import type { MarketOrder } from "@servicehub/shared/api-client";
import { messages } from "@servicehub/shared/messages/en";
import {
  useMarketplaceOrders,
  useMarketplaceSellerProfile,
  useSavedMarketplaceListings,
  useToggleSavedMarketplaceListing,
  useUpdateMarketplaceOrder,
} from "@servicehub/shared/hooks/use-marketplace";

function price(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value / 100);
}

const orderStatus: Record<MarketOrder["status"], string> = {
  REQUESTED: messages.marketplace.waitingForSeller,
  ACCEPTED: messages.marketplace.sellerAccepted,
  DECLINED: messages.marketplace.notAvailable,
  COMPLETED: messages.marketplace.completed,
  CANCELLED: messages.marketplace.cancelled,
};

export function MarketplaceOrdersWorkspace({ role }: { role: "BUYER" | "SELLER" }) {
  const { data: orders = [], isLoading, isError, error, refetch } = useMarketplaceOrders(role);
  const updateOrder = useUpdateMarketplaceOrder();
  return (
    <section className="marketplace-secondary-workspace">
      <div className="page-heading">
      <div><div className="eyebrow">{messages.marketplace.title}</div><h1>{role === "BUYER" ? messages.marketplace.buyerOrders : messages.marketplace.sellerOrders}</h1><p className="subtle">{messages.marketplace.ordersDescription}</p></div>
      </div>
      <nav className="marketplace-workspace-tabs" aria-label="Order views">
        <Link aria-current={role === "BUYER" ? "page" : undefined} href="/marketplace/orders?role=BUYER">{messages.marketplace.buyerOrders}</Link>
        <Link aria-current={role === "SELLER" ? "page" : undefined} href="/marketplace/orders?role=SELLER">{messages.marketplace.sellerOrders}</Link>
      </nav>
      {updateOrder.isError && <p className="form-error" role="alert">{updateOrder.error.message}</p>}
      {isLoading ? <p className="marketplace-state" role="status">{messages.marketplace.loadOrders}</p>
        : isError ? <div className="marketplace-state marketplace-state-error" role="alert"><p>{error.message}</p><button className="button button-secondary" type="button" onClick={() => void refetch()}>Try again</button></div>
          : orders.length ? <div className="marketplace-order-list">{orders.map((order) => (
            <article key={order.id} className="marketplace-order-card">
              <div><span className="landing-kicker">{orderStatus[order.status]}</span><h2>{order.listingTitle}</h2><p>{price(order.priceKobo)} · {role === "BUYER" ? `${messages.marketplace.sellerOrders}: ${order.seller.displayName}` : `${messages.marketplace.buyerOrders}: ${order.buyer.displayName}`}</p></div>
              <div className="marketplace-order-actions">
                {role === "BUYER" && order.status === "REQUESTED" && <button className="button button-secondary" type="button" disabled={updateOrder.isPending} onClick={() => updateOrder.mutate({ id: order.id, status: "CANCELLED" })}>{messages.marketplace.cancelRequest}</button>}
                {role === "SELLER" && order.status === "REQUESTED" && <>
                  <button className="button button-primary" type="button" disabled={updateOrder.isPending} onClick={() => updateOrder.mutate({ id: order.id, status: "ACCEPTED" })}>{messages.marketplace.acceptRequest}</button>
                  <button className="button button-secondary" type="button" disabled={updateOrder.isPending} onClick={() => updateOrder.mutate({ id: order.id, status: "DECLINED" })}>{messages.marketplace.declineRequest}</button>
                </>}
                {role === "SELLER" && order.status === "ACCEPTED" && <button className="button button-primary" type="button" disabled={updateOrder.isPending} onClick={() => updateOrder.mutate({ id: order.id, status: "COMPLETED" })}>{messages.marketplace.markComplete}</button>}
                <Link className="marketplace-text-link" href={`/marketplace/${order.listingId}`}>{messages.marketplace.viewItem}</Link>
              </div>
            </article>
          ))}</div>
            : <div className="marketplace-state marketplace-empty"><h2>{messages.marketplace.noOrders}</h2><p>{messages.marketplace.noOrdersHelp}</p><Link className="button button-primary" href="/marketplace">{messages.marketplace.browseMarketplace}</Link></div>}
    </section>
  );
}

export function SavedMarketplaceWorkspace() {
  const { data: listings = [], isLoading, isError, error, refetch } = useSavedMarketplaceListings();
  const toggleSaved = useToggleSavedMarketplaceListing();
  return (
    <section className="marketplace-secondary-workspace">
      <div className="page-heading"><div><div className="eyebrow">{messages.marketplace.title}</div><h1>{messages.marketplace.savedItemsTitle}</h1><p className="subtle">{messages.marketplace.savedItemsDescription}</p></div></div>
      {isLoading ? <p className="marketplace-state" role="status">{messages.marketplace.loadSavedItems}</p>
        : isError ? <div className="marketplace-state marketplace-state-error" role="alert"><p>{error.message}</p><button className="button button-secondary" type="button" onClick={() => void refetch()}>Try again</button></div>
          : listings.length ? <div className="marketplace-order-list">{listings.map((listing) => (
            <article className="marketplace-order-card" key={listing.id}>
              <div><span className="landing-kicker">{listing.area.name}, {listing.city.name}</span><h2>{listing.title}</h2><p>{price(listing.priceKobo)}</p></div>
              <div className="marketplace-order-actions"><Link className="button button-primary" href={`/marketplace/${listing.id}`}>{messages.marketplace.viewItem}</Link><button className="button button-secondary" type="button" disabled={toggleSaved.isPending} onClick={() => toggleSaved.mutate(listing.id)}>{messages.remove} {messages.marketplace.saveItem}</button></div>
            </article>
          ))}</div>
            : <div className="marketplace-state marketplace-empty"><h2>{messages.marketplace.noSavedItems}</h2><p>{messages.marketplace.noSavedItemsHelp}</p><Link className="button button-primary" href="/marketplace">{messages.marketplace.browseMarketplace}</Link></div>}
      {toggleSaved.isError && <p className="form-error" role="alert">{toggleSaved.error.message}</p>}
    </section>
  );
}

export function MarketplaceSellerProfile({ id }: { id: string }) {
  const { data: seller, isLoading, isError, error, refetch } = useMarketplaceSellerProfile(id);
  if (isLoading) return <p className="marketplace-state" role="status">{messages.marketplace.loadSellerProfile}</p>;
  if (isError) return <div className="marketplace-state marketplace-state-error" role="alert"><p>{error instanceof Error ? error.message : messages.marketplace.sellerLoadError}</p><button className="button button-secondary" type="button" onClick={() => void refetch()}>{messages.retry}</button><Link className="button button-secondary" href="/marketplace">{messages.marketplace.browseMarketplace}</Link></div>;
  if (!seller) return <div className="marketplace-state marketplace-empty"><h2>{messages.marketplace.noSellerItems}</h2><p>{messages.marketplace.noSellerItems}</p><Link className="button button-primary" href="/marketplace">{messages.marketplace.browseMarketplace}</Link></div>;
  return (
    <section className="marketplace-secondary-workspace">
      <div className="page-heading"><div><div className="eyebrow">{messages.marketplace.sellerLabel}</div><h1>{seller.displayName}</h1><p className="subtle">{seller.areaName}, Minna · {messages.marketplace.sellerProfileItems.replace("{count}", String(seller.listingCount))}</p></div></div>
      <div className="marketplace-order-list">{seller.listings.map((listing) => <article className="marketplace-order-card" key={listing.id}><div><span className="landing-kicker">{listing.area.name}</span><h2>{listing.title}</h2><p>{price(listing.priceKobo)}</p></div><Link className="button button-primary" href={`/marketplace/${listing.id}`}>{messages.marketplace.viewItem}</Link></article>)}</div>
      <Link className="marketplace-text-link" href="/marketplace">{messages.marketplace.browseMarketplace}</Link>
    </section>
  );
}
