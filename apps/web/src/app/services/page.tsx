import Link from "next/link";
import { liveFetch } from "@servicehub/shared/live-api-client";
import type { Category } from "@servicehub/shared/api-client";
import { PublicPageShell } from "@/components/public-page-shell";
import { AppIcon, getAppIconName } from "@/components/app-icon";
import { messages } from "@servicehub/shared/messages/en";

export default async function ServicesPage() {
  let categories: Category[] = [];
  let failed = false;
  try { categories = (await liveFetch<{ items: Category[] }>("/catalog/minna/categories")).items; } catch { failed = true; }
  return <PublicPageShell><main className="public-container public-content"><div className="public-page-heading"><div><h1>What can we help you with?</h1><p>Browse services available in Minna.</p></div><Link href="/technicians" className="button button-secondary">Browse technicians</Link></div>{failed ? <p className="form-error" role="alert">Services could not be loaded from ServiceHub.</p> : categories.length ? <div className="public-service-grid">{categories.map((category) => <Link key={category.id} href={`/services/${category.slug}`} className="public-service-card"><span className="public-service-icon"><AppIcon name={getAppIconName(category.iconKey)} /></span><h2>{category.name}</h2><p>{category.services.length} {category.services.length === 1 ? messages.services.oneService : messages.services.manyServices}</p><span className="public-card-link">Explore services</span></Link>)}</div> : <p className="subtle">No services are currently available.</p>}<aside className="public-callout"><div><h2>Are you a local service professional?</h2><p>Introduce your skills to customers looking for help in Minna.</p></div><Link href="/technician/onboarding" className="button button-primary">Join ServiceHub</Link></aside></main></PublicPageShell>;
}
