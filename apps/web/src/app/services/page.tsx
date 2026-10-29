import Link from "next/link";
import { categories } from "@servicehub/shared/fixtures/categories";
import { PublicPageShell } from "@/components/public-page-shell";

const categoryIcons: Record<string, string> = {
  home: "⌂",
  laptop: "▣",
  bike: "🚲",
  recycle: "↻",
};

export default function ServicesPage() {
  const activeCategories = categories.filter((category) => category.isActive);

  return (
    <PublicPageShell>
      <main className="public-container public-content">
        <div className="public-page-heading">
          <div>
            <span className="landing-kicker">SERVICES IN MINNA</span>
            <h1>What can we help you with?</h1>
            <p>Browse local services and find the right professional for the job.</p>
          </div>
          <Link href="/technicians" className="button button-secondary">Browse technicians</Link>
        </div>
        <div className="public-service-grid">
          {activeCategories.map((category) => (
            <Link key={category.id} href={`/services/${category.slug}`} className="public-service-card">
              <span className="public-service-icon" aria-hidden="true">{categoryIcons[category.iconKey] ?? "✳"}</span>
              <span className="landing-kicker">SERVICE CATEGORY</span>
              <h2>{category.name}</h2>
              <p>{category.services.length} services to explore</p>
              <span className="public-card-link">Explore services <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <aside className="public-callout">
          <div><span className="landing-kicker">YOUR SKILL, YOUR BUSINESS</span><h2>Are you a local service professional?</h2><p>Introduce your skills to customers looking for help in Minna.</p></div>
          <Link href="/technician/onboarding" className="button button-primary">Join ServiceHub</Link>
        </aside>
      </main>
    </PublicPageShell>
  );
}
