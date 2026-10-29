import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function MaintenancePage() {
  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <span className="public-status-illustration" aria-hidden="true">✳</span>
          <span className="landing-kicker">A SHORT PAUSE</span>
          <h1>We’re making ServiceHub better.</h1>
          <p>ServiceHub is temporarily unavailable while maintenance is in progress. Please check back soon.</p>
          <div className="public-status-actions"><Link href="/" className="button button-primary">Try the homepage</Link><Link href="/help" className="button button-secondary">Visit help centre</Link></div>
        </section>
      </main>
    </PublicPageShell>
  );
}
