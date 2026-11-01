import Link from "next/link";
import { notFound } from "next/navigation";
import { categories } from "@servicehub/shared/fixtures/categories";
import { PublicPageShell } from "@/components/public-page-shell";
import { AppIcon, getAppIconName } from "@/components/app-icon";

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
            <h1>{category.name}</h1>
            <p>Choose a service to find professionals who can help in Minna.</p>
          </div>
          <Link href="/technicians" className="button button-secondary">Browse all technicians</Link>
        </div>
        <div className="public-service-detail-grid">
          {category.services.map((service) => (
            <article key={service.id} id={service.slug} className="public-service-detail-card">
              <span className="public-service-icon"><AppIcon name={getAppIconName(service.iconKey)} /></span>
              <h2>{service.name}</h2>
              <p>Connect with local professionals offering {service.name.toLowerCase()} services.</p>
              <Link href="/technicians" className="public-card-link">Find a professional</Link>
            </article>
          ))}
        </div>
        <Link href="/services" className="public-back-link"><AppIcon name="arrow-left" size={16} /> Back to all services</Link>
      </main>
    </PublicPageShell>
  );
}
