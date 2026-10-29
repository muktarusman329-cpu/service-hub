import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function ServerErrorPage() {
  return (
    <PublicPageShell>
      <main className="public-container public-status-wrap">
        <section className="public-status-card">
          <span className="public-status-code">500</span>
          <span className="landing-kicker">TEMPORARY ERROR</span>
          <h1>Something didn’t go as planned.</h1>
          <p>Please try again in a little while. Your account and service details have not been changed by viewing this page.</p>
          <div className="public-status-actions"><Link href="/" className="button button-primary">Return home</Link><Link href="/help" className="button button-secondary">Visit help centre</Link></div>
        </section>
      </main>
    </PublicPageShell>
  );
}
