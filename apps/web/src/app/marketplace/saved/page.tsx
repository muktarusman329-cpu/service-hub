import { SavedMarketplaceWorkspace } from "@/components/marketplace-secondary-workspaces";
import { PublicPageShell } from "@/components/public-page-shell";

export default function SavedMarketplacePage() {
  return <PublicPageShell><main className="public-container marketplace-content"><SavedMarketplaceWorkspace /></main></PublicPageShell>;
}
