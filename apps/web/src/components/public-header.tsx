"use client";

import Link from "next/link";
import { useState } from "react";
import { messages } from "@servicehub/shared/messages/en";
import { AppIcon } from "@/components/app-icon";

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
          <span>ServiceHub</span>
        </Link>
        <nav className={navClass} aria-label="Main navigation">
          <Link href="/services">{messages.landing.services}</Link>
          <Link href="/technicians">{messages.landing.technicians}</Link>
          <Link href="/marketplace">{messages.landing.marketplace}</Link>
          <Link href="/help">{messages.landing.help}</Link>
        </nav>
        <div className={actionsClass}>
          <Link href="/sign-in" className="landing-sign-in">{messages.landing.signIn}</Link>
          <Link href="/app/jobs/new" className="button button-primary">{messages.landing.requestService}</Link>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMenuOpen ? messages.landing.closeNavigationMenu : messages.landing.navigationMenu}
            aria-expanded={isMenuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <AppIcon name={isMenuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <nav id="public-mobile-menu" className={`mobile-menu ${landing ? "mobile-menu-landing" : "mobile-menu-public"}`} aria-label="Mobile navigation">
          <Link href="/services" onClick={closeMenu}>{messages.landing.services}</Link>
          <Link href="/technicians" onClick={closeMenu}>{messages.landing.technicians}</Link>
          <Link href="/marketplace" onClick={closeMenu}>{messages.landing.marketplace}</Link>
          <Link href="/help" onClick={closeMenu}>{messages.landing.help}</Link>
          <Link href="/technician/onboarding" onClick={closeMenu}>{messages.landing.becomeTechnician}</Link>
          <Link href="/sign-in" onClick={closeMenu}>{messages.landing.signIn}</Link>
          <Link href="/app/jobs/new" className="mobile-menu-cta" onClick={closeMenu}>{messages.landing.requestService}</Link>
        </nav>
      )}
    </header>
  );
}
