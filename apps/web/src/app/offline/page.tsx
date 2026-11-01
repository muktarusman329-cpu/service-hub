"use client";

import { useRouter } from "next/navigation";
import { PublicPageShell } from "@/components/public-page-shell";
import { AppIcon } from "@/components/app-icon";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <AppIcon name="wifi-off" />
          <h1>You appear to be offline.</h1>
          <p>Check your internet connection, then try loading the page again.</p>
          <button type="button" className="button button-primary" onClick={() => router.refresh()}>Try again</button>
        </section>
      </main>
    </PublicPageShell>
  );
}
