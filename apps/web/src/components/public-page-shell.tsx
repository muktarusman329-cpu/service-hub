import Link from "next/link";
import { PublicHeader } from "@/components/public-header";

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-page">
      <PublicHeader variant="public" />
      {children}
      <footer className="landing-footer">
        <div className="public-container">
          <div className="landing-footer-main">
            <div>
              <Link href="/" className="landing-brand"><span className="landing-brand-mark">S</span><span>ServiceHub</span></Link>
              <p>Local services, made easier.</p>
            </div>
            <div className="landing-footer-links">
              <Link href="/services">Services</Link>
              <Link href="/marketplace">Marketplace</Link>
              <Link href="/technicians">Technicians</Link>
              <Link href="/help">Help centre</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
          <div className="landing-footer-bottom"><span>Serving Minna, Nigeria</span><span>© 2026 ServiceHub</span></div>
        </div>
      </footer>
    </div>
  );
}
