import Link from "next/link";
import { Button } from "@servicehub/ui/components";
import { SignOutButton } from "@/components/sign-out-button";

const navigation: Record<string, string[]> = {
  Customer: ["Home", "Requests", "Bookings", "Messages"],
  Technician: ["Overview", "Available jobs", "My jobs", "Messages"],
  Admin: ["Overview", "Technicians", "Bookings", "Categories", "Reports"]
};

export function ProductShell({ audience, children }: { audience: keyof typeof navigation; children: React.ReactNode }) {
  const home = audience === "Customer" ? "/app" : `/${audience.toLowerCase()}`;
  return <div className="shell">
    <header className="topbar">
      <div className="topbar-main">
        <Link className="brand" href="/"><span className="brand-mark">S</span> ServiceHub</Link>
        <form className="search-box" role="search" action="#">
          <input className="search-input" type="search" aria-label="Search ServiceHub" placeholder="Search services, skills or items" />
          <Button className="search-button" type="button">Search</Button>
        </form>
        <div className="top-actions">
          <button className="top-icon" aria-label="Notifications">Alerts</button>
          <button className="language-button" aria-label="Language">EN</button>
          <Link className="avatar" aria-label="Account security" href="/account/security">{audience === "Admin" ? "A" : audience === "Technician" ? "T" : "U"}</Link>
          <SignOutButton />
        </div>
      </div>
      <nav className="primary-nav" aria-label="Main navigation">{navigation[audience].map((item, index) => { const href = item === "Requests" ? "/app/jobs" : item === "Available jobs" ? "/technician/jobs" : item === "Bookings" ? audience === "Admin" ? "/admin/jobs" : "/app/bookings" : item === "Messages" ? "/app/messages" : index === 0 ? home : "#"; return <Link key={item} className={`nav-link ${index === 0 ? "active" : ""}`} href={href}>{item}</Link>; })}</nav>
    </header>
    <main className="main"><div className="content"><div className="breadcrumb" aria-label="Breadcrumb"><span>Minna</span><span aria-hidden="true">›</span><span>{audience}</span><span aria-hidden="true">›</span><span>Overview</span></div>{children}</div></main>
  </div>;
}
