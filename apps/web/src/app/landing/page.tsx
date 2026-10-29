import Link from "next/link";
import { categories } from "@servicehub/shared/fixtures/categories";
import { PublicHeader } from "@/components/public-header";

const categoryIcons: Record<string, string> = {
  home: "⌂",
  laptop: "▣",
  bike: "🚲",
  recycle: "↻",
};

export default function LandingPage() {
  return (
    <main className="landing-page">
      <PublicHeader variant="landing" />

      <section className="landing-hero">
        <div className="landing-container landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow"><span aria-hidden="true" /> LOCAL SERVICES IN MINNA</span>
            <h1>Good help, right around the corner.</h1>
            <p>Find trusted local professionals for the jobs that matter at home and at work.</p>
            <div className="landing-hero-actions">
              <Link href="/services" className="button button-primary">Explore services <span aria-hidden="true">→</span></Link>
              <Link href="/technician/onboarding" className="landing-secondary-link">Offer your services <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="landing-proof"><span aria-hidden="true">✓</span> Local professionals · Clear quotes · Support when you need it</div>
          </div>
          <div className="landing-hero-card" aria-label="How ServiceHub helps you">
            <div className="landing-card-topline"><span>YOUR NEXT JOB, SORTED</span><span className="landing-live-dot">MINNA</span></div>
            <div className="landing-card-icon" aria-hidden="true">⌂</div>
            <h2>One place to find the right help.</h2>
            <p>Tell us what you need. Connect with a local professional and agree on the work before it begins.</p>
            <div className="landing-card-foot"><span>Made for your neighbourhood</span><span aria-hidden="true">✳</span></div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-categories" aria-labelledby="landing-categories-title">
        <div className="landing-container">
          <div className="landing-section-heading">
            <div><span className="landing-kicker">WHAT DO YOU NEED?</span><h2 id="landing-categories-title">Find help for everyday jobs</h2></div>
            <Link href="/services" className="landing-text-link">Browse all services <span aria-hidden="true">→</span></Link>
          </div>
          <div className="landing-category-grid">
            {categories.filter((category) => category.isActive).map((category) => (
              <Link key={category.id} href={`/services/${category.slug}`} className="landing-category-card">
                <span className="landing-category-icon" aria-hidden="true">{categoryIcons[category.iconKey] ?? "✳"}</span>
                <span className="landing-category-name">{category.name}</span>
                <span className="landing-category-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-container landing-marketplace-promo">
        <div className="landing-marketplace-art" aria-hidden="true"><span>✳</span><span>↻</span><span>▤</span></div>
        <div><span className="landing-kicker">THE MINNA MARKETPLACE</span><h2>Good finds deserve a second home.</h2><p>Discover pre-loved clothes, home essentials, books and more from people around Minna.</p></div>
        <Link href="/marketplace" className="button button-primary">Explore the marketplace <span aria-hidden="true">→</span></Link>
      </section>

      <section className="landing-section landing-how">
        <div className="landing-container">
          <div className="landing-section-heading landing-section-heading-centered">
            <div><span className="landing-kicker">SIMPLE FROM START TO FINISH</span><h2>Getting it done is easy</h2></div>
          </div>
          <div className="landing-steps">
            <article className="landing-step"><span className="landing-step-number">01</span><h3>Tell us what you need</h3><p>Share a few details about the job and where you are in Minna.</p></article>
            <article className="landing-step"><span className="landing-step-number">02</span><h3>Choose your professional</h3><p>Review your options and agree on the work before it starts.</p></article>
            <article className="landing-step"><span className="landing-step-number">03</span><h3>Get on with your day</h3><p>Stay in touch and get support throughout your service.</p></article>
          </div>
        </div>
      </section>

      <section className="landing-trust">
        <div className="landing-container landing-trust-inner">
          <div><span className="landing-kicker">A BETTER WAY TO GET THINGS DONE</span><h2>Local know-how.<br />A little more peace of mind.</h2></div>
          <div className="landing-trust-points">
            <div><span aria-hidden="true">✓</span><p><strong>People who know Minna</strong><br />Find help from professionals serving your community.</p></div>
            <div><span aria-hidden="true">✓</span><p><strong>Clear conversations</strong><br />Discuss the job and expectations before work begins.</p></div>
            <div><span aria-hidden="true">✓</span><p><strong>Support along the way</strong><br />We’re here to help if you have questions.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-faq">
        <div className="landing-container landing-faq-inner">
          <div><span className="landing-kicker">GOOD TO KNOW</span><h2>Questions, answered.</h2><p>Need a hand? Visit our <Link href="/help">help centre</Link>.</p></div>
          <div className="landing-faq-list">
            <details><summary>How do I find a service professional?</summary><p>Browse services, describe the job you need done, and connect with professionals serving your area.</p></details>
            <details><summary>Can I join ServiceHub as a professional?</summary><p>Yes. Start with the technician onboarding form and tell us about your skills and experience.</p></details>
            <details><summary>Where is ServiceHub available?</summary><p>ServiceHub is starting in Minna, with local services for the community.</p></details>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div><Link href="/" className="landing-brand"><span className="landing-brand-mark">S</span><span>ServiceHub</span></Link><p>Local services, made easier.</p></div>
            <div className="landing-footer-links"><Link href="/services">Services</Link><Link href="/technicians">Technicians</Link><Link href="/help">Help centre</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
          </div>
          <div className="landing-footer-bottom"><span>Serving Minna, Nigeria</span><span>© 2026 ServiceHub</span></div>
        </div>
      </footer>
    </main>
  );
}
