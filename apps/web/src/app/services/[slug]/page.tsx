import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@servicehub/shared/fixtures/categories";
import { PublicPageShell } from "@/components/public-page-shell";

const serviceIcons: Record<string, string> = {
  wrench: "🔧",
  bolt: "⚡",
  snowflake: "❄",
  zap: "ϟ",
  smartphone: "▣",
  network: "⌘",
  code: "</>",
  bike: "🚲",
  "shopping-bag": "▤",
};

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug && item.isActive);
  if (!category) notFound();

  return (
    <PublicPageShell>
      <main className="public-container public-content">
        <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/services">Services</Link><span>/</span><span aria-current="page">{category.name}</span></nav>
        <div className="public-page-heading">
          <div>
            <span className="landing-kicker">SERVICE CATEGORY</span>
            <h1>{category.name}</h1>
            <p>Choose a service to find professionals who can help in Minna.</p>
          </div>
          <Link href="/technicians" className="button button-secondary">Browse all technicians</Link>
        </div>
        <div className="public-service-detail-grid">
          {category.services.map((service) => (
            <article key={service.id} className="public-service-detail-card">
              <span className="public-service-icon" aria-hidden="true">{serviceIcons[service.iconKey] ?? "✳"}</span>
              <h2>{service.name}</h2>
              <p>Connect with local professionals offering {service.name.toLowerCase()} services.</p>
              <Link href="/technicians" className="public-card-link">Find a professional <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
        <Link href="/services" className="public-back-link">← Back to all services</Link>
      </main>
    </PublicPageShell>
  );
}
