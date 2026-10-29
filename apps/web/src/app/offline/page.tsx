"use client";

import { useRouter } from "next/navigation";
import { PublicPageShell } from "@/components/public-page-shell";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <span className="public-status-illustration" aria-hidden="true">⌁</span>
          <span className="landing-kicker">CONNECTION INTERRUPTED</span>
          <h1>You appear to be offline.</h1>
          <p>Check your internet connection, then try loading the page again.</p>
          <button type="button" className="button button-primary" onClick={() => router.refresh()}>Try again</button>
        </section>
      </main>
    </PublicPageShell>
  );
}
