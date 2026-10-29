import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function NotFoundPreviewPage() {
  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <span className="public-status-code">404</span>
          <span className="landing-kicker">PAGE NOT FOUND</span>
          <h1>We can’t find that page.</h1>
          <p>The link may be out of date, or the page may have moved. Let’s get you back to something useful.</p>
          <div className="public-status-actions"><Link href="/" className="button button-primary">Go to homepage</Link><Link href="/services" className="button button-secondary">Browse services</Link></div>
        </section>
      </main>
    </PublicPageShell>
  );
}
