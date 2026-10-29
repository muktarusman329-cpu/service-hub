import type { Metadata } from "next";
import { MarketplaceListingDetail } from "@/components/marketplace-listing-detail";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Marketplace listing | ServiceHub",
};

export default async function MarketplaceListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PublicPageShell>
      <main className="public-container public-content"><MarketplaceListingDetail id={id} /></main>
    </PublicPageShell>
  );
}
