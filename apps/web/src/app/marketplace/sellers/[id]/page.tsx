import { MarketplaceSellerProfile } from "@/components/marketplace-secondary-workspaces";
import { PublicPageShell } from "@/components/public-page-shell";

export default async function MarketplaceSellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicPageShell><main className="public-container marketplace-content"><MarketplaceSellerProfile id={id} /></main></PublicPageShell>;
}
