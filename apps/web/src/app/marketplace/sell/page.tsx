import type { Metadata } from "next";
import { MarketplaceSellerWorkspace } from "@/components/marketplace-seller-workspace";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Sell on the Minna Marketplace | ServiceHub",
  description: "List quality pre-loved items for buyers around Minna.",
};

export default function SellOnMarketplacePage() {
  return (
    <PublicPageShell>
      <main className="public-container public-content"><MarketplaceSellerWorkspace /></main>
    </PublicPageShell>
  );
}
