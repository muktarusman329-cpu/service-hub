"use client";

import Link from "next/link";
import { useState } from "react";

type PublicHeaderProps = {
  variant: "landing" | "public";
};

export function PublicHeader({ variant }: PublicHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const landing = variant === "landing";
  const headerClass = landing ? "landing-header" : "public-header";
  const containerClass = landing ? "landing-container landing-header-inner" : "public-container public-header-inner";
  const navClass = landing ? "landing-nav" : "public-nav";
  const actionsClass = landing ? "landing-header-actions" : "public-header-actions";

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className={headerClass}>
      <div className={containerClass}>
        <Link href="/" className="landing-brand" aria-label="ServiceHub home" onClick={closeMenu}>
          <span className="landing-brand-mark">S</span>
          <span>ServiceHub</span>
        </Link>
        <nav className={navClass} aria-label="Main navigation">
          <Link href="/services">Services</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/technicians">Technicians</Link>
          <Link href="/help">Help</Link>
        </nav>
        <div className={actionsClass}>
          <Link href="/sign-in" className="landing-sign-in">Sign in</Link>
          <Link href="/app/jobs/new" className="button button-primary">Request a service</Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="mobile-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <nav id="public-mobile-menu" className={`mobile-menu ${landing ? "mobile-menu-landing" : "mobile-menu-public"}`} aria-label="Mobile navigation">
          <Link href="/services" onClick={closeMenu}>Services</Link>
          <Link href="/marketplace" onClick={closeMenu}>Marketplace</Link>
          <Link href="/technicians" onClick={closeMenu}>Browse technicians</Link>
          <Link href="/help" onClick={closeMenu}>Help centre</Link>
          <Link href="/technician/onboarding" onClick={closeMenu}>Become a technician</Link>
          <Link href="/sign-in" onClick={closeMenu}>Sign in</Link>
          <Link href="/app/jobs/new" className="mobile-menu-cta" onClick={closeMenu}>Request a service <span aria-hidden="true">→</span></Link>
        </nav>
      )}
    </header>
  );
}
