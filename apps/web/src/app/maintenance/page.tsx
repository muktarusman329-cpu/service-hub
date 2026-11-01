import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";
import { AppIcon } from "@/components/app-icon";

export default function MaintenancePage() {
  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <AppIcon name="clock" />
          <h1>We’re making ServiceHub better.</h1>
          <p>ServiceHub is temporarily unavailable while maintenance is in progress. Please check back soon.</p>
          <div className="public-status-actions"><Link href="/" className="button button-primary">Try the homepage</Link><Link href="/help" className="button button-secondary">Visit help centre</Link></div>
        </section>
      </main>
    </PublicPageShell>
  );
}
