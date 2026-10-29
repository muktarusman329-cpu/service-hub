import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

export default function ContactPage() {
  return (
    <PublicPageShell>
      <main className="public-container public-content">
        <div className="public-page-heading">
          <div>
            <span className="landing-kicker">WE’RE HERE TO HELP</span>
            <h1>Contact ServiceHub</h1>
            <p>Choose the option that best matches what you need. This preview does not send support requests.</p>
          </div>
        </div>
        <div className="public-contact-grid">
          <section className="public-panel">
            <span className="public-contact-icon" aria-hidden="true">?</span>
            <span className="landing-kicker">CUSTOMER SUPPORT</span>
            <h2>Need help with a service?</h2>
            <p>Read answers to common questions about requests, bookings, payments and your account.</p>
            <Link href="/help" className="button button-primary">Visit the help centre</Link>
          </section>
          <section className="public-panel">
            <span className="public-contact-icon" aria-hidden="true">⌂</span>
            <span className="landing-kicker">SERVICE PROFESSIONALS</span>
            <h2>Interested in joining?</h2>
            <p>Start your technician profile and share your skills with customers in Minna.</p>
            <Link href="/technician/onboarding" className="button button-secondary">Start onboarding</Link>
          </section>
          <section className="public-panel public-contact-note">
            <span className="landing-kicker">CONTACT DETAILS</span>
            <h2>Support channels are being prepared</h2>
            <p>Direct contact details and request submission will be added before launch. No message is sent from this preview.</p>
          </section>
        </div>
      </main>
    </PublicPageShell>
  );
}
