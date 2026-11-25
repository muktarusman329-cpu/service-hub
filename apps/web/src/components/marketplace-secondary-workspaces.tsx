"use client";

import { Card } from "@servicehub/ui/components";

function Unavailable({ title }: { title: string }) {
  return <Card><h1>{title}</h1><p className="subtle">This workflow is not supported by the live API yet. No sample records or local-only actions are displayed.</p></Card>;
}

export function SavedMarketplaceWorkspace() { return <Unavailable title="Saved listings" />; }
export function MarketplaceOrdersWorkspace(props: { role?: "BUYER" | "SELLER" }) { void props; return <Unavailable title="Marketplace orders" />; }
export function MarketplaceSellerProfile({ id }: { id: string }) { void id; return <Unavailable title="Seller profile" />; }
