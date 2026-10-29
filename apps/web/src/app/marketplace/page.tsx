import type { Metadata } from "next";
import { MarketplaceBrowser } from "@/components/marketplace-browser";
import { PublicPageShell } from "@/components/public-page-shell";

export const metadata: Metadata = {
  title: "Minna Marketplace | ServiceHub",
  description: "Shop pre-loved clothing, home goods, electronics, books and more from people around Minna.",
};

export default function MarketplacePage() {
  return (
    <PublicPageShell>
      <main className="public-container marketplace-content">
        <MarketplaceBrowser />
      </main>
    </PublicPageShell>
  );
}
