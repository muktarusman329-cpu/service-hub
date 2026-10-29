import { AdminGate } from "@/components/admin-gate";
import { MarketplaceReviewWorkspace } from "@/components/marketplace-review-workspace";

export default function AdminMarketplacePage() {
  return <AdminGate><MarketplaceReviewWorkspace /></AdminGate>;
}
