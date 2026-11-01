import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { messages } from "@servicehub/shared/messages/en";

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-page">
      <PublicHeader variant="public" />
      {children}
      <footer className="landing-footer">
        <div className="public-container">
          <div className="landing-footer-main">
            <div>
              <Link href="/" className="landing-brand"><span>ServiceHub</span></Link>
              <p>{messages.landing.servingMinna}</p>
            </div>
            <div className="landing-footer-links">
              <Link href="/services">{messages.landing.services}</Link>
              <Link href="/marketplace">{messages.landing.marketplace}</Link>
              <Link href="/technicians">{messages.landing.technicians}</Link>
              <Link href="/help">{messages.landing.footerHelp}</Link>
              <Link href="/contact">{messages.landing.footerContact}</Link>
              <Link href="/privacy">{messages.landing.footerPrivacy}</Link>
              <Link href="/terms">{messages.landing.footerTerms}</Link>
            </div>
          </div>
          <div className="landing-footer-bottom"><span>{messages.landing.servingMinna}</span><span>{messages.landing.copyright}</span></div>
        </div>
      </footer>
    </div>
  );
}
