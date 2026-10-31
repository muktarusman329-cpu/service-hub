import { MarketplaceOrdersWorkspace } from "@/components/marketplace-secondary-workspaces";
import { PublicPageShell } from "@/components/public-page-shell";

export default async function MarketplaceOrdersPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return <PublicPageShell><main className="public-container marketplace-content"><MarketplaceOrdersWorkspace role={role === "SELLER" ? "SELLER" : "BUYER"} /></main></PublicPageShell>;
}
