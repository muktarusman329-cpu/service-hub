"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { messages } from "@servicehub/shared/messages/en";
import type { TechnicianPublic } from "@servicehub/shared/api-client";
import { useTechnicians } from "@servicehub/shared/hooks/use-technicians";
import { useCatalog } from "@servicehub/shared/hooks/use-catalog";
import { AppIcon, getAppIconName } from "@/components/app-icon";
import { PublicHeader } from "@/components/public-header";

function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-placeholder ${className}`} role="img" aria-label={label} />;
}

function TechnicianCard({ technician }: { technician: TechnicianPublic }) {
  return (
    <Link href={`/technicians/${technician.id}`} className="landing-v2-technician-card">
      <PhotoPlaceholder label={`${messages.landing.demoImageAlt}: ${technician.publicName}`} className="landing-v2-technician-photo" />
      <div className="landing-v2-technician-details">
        <h3>{technician.publicName}</h3>
        <p>{technician.skills[0]?.service.name ?? messages.landing.technicians}</p>
        <span className="landing-v2-technician-area">{technician.areas[0]?.area.name ?? "Minna"}</span>
        <span className="landing-v2-technician-facts">
          <span><AppIcon name="star" size={16} /> {technician.rating.average.toFixed(1)}</span>
          <span>{technician.completedJobCount} {messages.landing.jobsCompleted}</span>
        </span>
        {technician.verified && <span className="landing-v2-verified"><AppIcon name="badge-check" size={16} /> {messages.technicians.verified}</span>}
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const catalogQuery = useCatalog();
  // Landing technician cards use display-only data from the mock API client.
  const techniciansQuery = useTechnicians("minna");
  const [serviceSlug, setServiceSlug] = useState("");
  const [areaSlug, setAreaSlug] = useState("");
  const serviceEntries = catalogQuery.data?.categories
    .filter((category) => category.isActive)
    .flatMap((category) => category.services
      .filter((service) => service.isActive)
      .map((service) => ({ ...service, categorySlug: category.slug }))) ?? [];

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const service = serviceEntries.find((entry) => entry.slug === serviceSlug);
    if (!service || !areaSlug) return;
    router.push(`/app/jobs/new?service=${encodeURIComponent(service.slug)}&area=${encodeURIComponent(areaSlug)}`);
  }

  return (
    <main className="landing-v2">
      <PublicHeader variant="landing" />

      <section className="landing-v2-hero">
        <div className="landing-v2-container landing-v2-hero-grid">
          <div className="landing-v2-hero-copy">
            <h1>{messages.landing.heroTitle}</h1>
            <p>{messages.landing.heroSubtitle}</p>
            <form className="landing-v2-request" onSubmit={submitRequest}>
              <label>
                <span>{messages.landing.servicePrompt}</span>
                <select required value={serviceSlug} onChange={(event) => setServiceSlug(event.target.value)}>
                  <option value="">{catalogQuery.isLoading ? messages.loading : messages.landing.servicePrompt}</option>
                  {serviceEntries.map((service) => <option key={service.id} value={service.slug}>{service.name}</option>)}
                </select>
              </label>
              <label>
                <span>{messages.landing.areaPrompt}</span>
                <select required value={areaSlug} onChange={(event) => setAreaSlug(event.target.value)}>
                  <option value="">{messages.landing.allAreas}</option>
                  {minnaAreas.map((area) => <option key={area.id} value={area.slug}>{area.name}</option>)}
                </select>
              </label>
              <button type="submit" className="button button-primary" disabled={catalogQuery.isLoading || catalogQuery.isError || !serviceEntries.length}>{messages.landing.findHelp}</button>
            </form>
            {catalogQuery.isError && <div className="landing-v2-query-error" role="alert"><p>{messages.error}. Please try again.</p><button type="button" className="button button-secondary" onClick={() => void catalogQuery.refetch()}>{messages.retry}</button></div>}
            {!catalogQuery.isLoading && !catalogQuery.isError && !serviceEntries.length && <p className="landing-v2-empty">{messages.empty}</p>}
            <div className="landing-v2-facts">
              {/* Payment safety messaging is a preview until payment hold and release are implemented. */}
              {[messages.landing.verifiedFact, messages.landing.quoteFact, messages.landing.paymentFact].map((fact) => (
                <span key={fact}><AppIcon name="check" size={16} />{fact}</span>
              ))}
            </div>
          </div>
          <PhotoPlaceholder label={messages.landing.heroPhotoAlt} className="landing-v2-hero-photo" />
        </div>
      </section>

      <section className="landing-v2-section">
        <div className="landing-v2-container">
          <div className="landing-v2-section-heading">
            <h2>{messages.landing.popularServices}</h2>
            <Link href="/services">{messages.landing.viewAllServices}<AppIcon name="arrow-right" size={16} /></Link>
          </div>
          <div className="landing-v2-service-grid">
            {serviceEntries.map((service) => (
              <Link key={service.id} href={`/services/${service.categorySlug}#${service.slug}`} className="landing-v2-service-card">
                <AppIcon name={getAppIconName(service.iconKey)} />
                <h3>{service.name}</h3>
                <span>{messages.landing.priceFrom} {messages.landing.servicePriceGuidance[service.slug as keyof typeof messages.landing.servicePriceGuidance]}</span>
                <AppIcon className="landing-v2-card-arrow" name="arrow-right" size={16} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-v2-section landing-v2-how">
        <div className="landing-v2-container">
          <h2>{messages.landing.howItWorks}</h2>
          <div className="landing-v2-steps">
            <article><span>1</span><AppIcon name="clipboard-list" /><p>{messages.landing.stepOne}</p></article>
            <article><span>2</span><AppIcon name="messages-square" /><p>{messages.landing.stepTwo}</p></article>
            <article><span>3</span><AppIcon name="check" /><p>{messages.landing.stepThree}</p></article>
          </div>
        </div>
      </section>

      <section className="landing-v2-section">
        <div className="landing-v2-container">
          <h2>{messages.landing.techniciansNearYou}</h2>
          {techniciansQuery.isLoading ? (
            <div className="landing-v2-technician-grid" role="status">{[1, 2, 3].map((item) => <div key={item} className="landing-v2-skeleton" />)}</div>
          ) : techniciansQuery.isError ? (
            <div className="landing-v2-query-error" role="alert">
              <p>{messages.error}. {messages.retry}</p>
              <button type="button" className="button button-secondary" onClick={() => void techniciansQuery.refetch()}>{messages.retry}</button>
            </div>
          ) : techniciansQuery.data?.length ? (
            <div className="landing-v2-technician-grid">
              {techniciansQuery.data.slice(0, 4).map((technician) => <TechnicianCard key={technician.id} technician={technician} />)}
            </div>
          ) : (
            <p className="landing-v2-empty">{messages.technicians.noTechnicians}</p>
          )}
        </div>
      </section>

      <section className="landing-v2-marketplace">
        <div className="landing-v2-container">
          <AppIcon name="recycle" />
          <p>{messages.landing.marketplaceStrip}</p>
          <Link href="/marketplace" className="button button-secondary">{messages.landing.browseMarketplace}</Link>
        </div>
      </section>

      <section className="landing-v2-section">
        <div className="landing-v2-container">
          <h2>{messages.landing.trustTitle}</h2>
          {/* These claims depend on identity review and payment hold/release being live before launch. */}
          <div className="landing-v2-trust-grid">
            <article><AppIcon name="badge-check" /><h3>{messages.landing.idChecked}</h3><p>{messages.landing.idCheckedDescription}</p></article>
            <article><AppIcon name="shield-check" /><h3>{messages.landing.protectedPayment}</h3><p>{messages.landing.protectedPaymentDescription}</p></article>
            <article><AppIcon name="message" /><h3>{messages.landing.supportTitle}</h3><p>{messages.landing.supportDescription}</p></article>
          </div>
        </div>
      </section>

      <section className="landing-v2-technician-cta">
        <div className="landing-v2-container">
          <h2>{messages.landing.technicianCtaTitle}</h2>
          <Link href="/technician/onboarding" className="button button-secondary">{messages.landing.becomeTechnician}</Link>
        </div>
      </section>

      <section className="landing-v2-section landing-v2-faq">
        <div className="landing-v2-container">
          <h2>{messages.landing.faqTitle}</h2>
          <Accordion.Root type="single" collapsible>
            {[
              [messages.landing.faqOneQuestion, messages.landing.faqOneAnswer],
              [messages.landing.faqTwoQuestion, messages.landing.faqTwoAnswer],
              [messages.landing.faqThreeQuestion, messages.landing.faqThreeAnswer],
              [messages.landing.faqFourQuestion, messages.landing.faqFourAnswer],
              [messages.landing.faqFiveQuestion, messages.landing.faqFiveAnswer],
            ].map(([question, answer], index) => (
              <Accordion.Item className="landing-v2-faq-item" key={question} value={`faq-${index + 1}`}>
                <Accordion.Header>
                  <Accordion.Trigger>
                    {question}
                    <AppIcon name="chevron-down" size={16} />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content><p>{answer}</p></Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>

      <footer className="landing-v2-footer">
        <div className="landing-v2-container">
          <div className="landing-v2-footer-brand"><Link href="/">ServiceHub</Link><p>{messages.landing.servingMinna}</p></div>
          <div className="landing-v2-footer-column"><h3>{messages.landing.servicesColumn}</h3><Link href="/services">{messages.landing.services}</Link><Link href="/technicians">{messages.landing.technicians}</Link><Link href="/marketplace">{messages.landing.marketplace}</Link></div>
          <div className="landing-v2-footer-column"><h3>{messages.landing.companyColumn}</h3><Link href="/technician/onboarding">{messages.landing.footerTechnicians}</Link><Link href="/privacy">{messages.landing.footerPrivacy}</Link><Link href="/terms">{messages.landing.footerTerms}</Link></div>
          <div className="landing-v2-footer-column"><h3>{messages.landing.supportColumn}</h3><Link href="/help">{messages.landing.footerHelp}</Link><Link href="/contact">{messages.landing.footerContact}</Link><a href={messages.contact.whatsappUrl} target="_blank" rel="noreferrer">{messages.landing.whatsapp}</a></div>
          <p className="landing-v2-copyright">{messages.landing.copyright}</p>
        </div>
      </footer>
    </main>
  );
}
