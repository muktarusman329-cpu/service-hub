import Link from "next/link";
import { Button } from "@servicehub/ui/components";
import { SignOutButton } from "@/components/sign-out-button";
import { AppIcon } from "@/components/app-icon";

type Audience = "Customer" | "Technician" | "Admin";
type NavigationItem = { label: string; href: string };

const navigation: Record<Audience, NavigationItem[]> = {
  Customer: [
    { label: "Home", href: "/app" },
    { label: "Requests", href: "/app/jobs" },
    { label: "Bookings", href: "/app/bookings" },
    { label: "Messages", href: "/app/messages" },
    { label: "Payments", href: "/app/payments" },
    { label: "Reviews", href: "/app/reviews" },
    { label: "Notifications", href: "/app/notifications" },
  ],
  Technician: [
    { label: "Overview", href: "/technician" },
    { label: "Available jobs", href: "/technician/jobs" },
    { label: "Bookings", href: "/technician/bookings" },
    { label: "My quotes", href: "/technician/quotes" },
    { label: "Wallet", href: "/technician/wallet" },
    { label: "Availability", href: "/technician/availability" },
    { label: "Earnings", href: "/technician/earnings" },
    { label: "Settings", href: "/technician/settings" },
    { label: "Notifications", href: "/technician/notifications" },
  ],
  Admin: [
    { label: "Overview", href: "/admin" },
    { label: "Users", href: "/admin/users" },
    { label: "Technicians", href: "/admin/technicians" },
    { label: "Catalog", href: "/admin/catalog" },
    { label: "Bookings", href: "/admin/jobs" },
    { label: "Marketplace", href: "/admin/marketplace" },
    { label: "Flags", href: "/admin/jobs/flags" },
    { label: "Disputes", href: "/admin/jobs/disputes" },
    { label: "Payments", href: "/admin/payments" },
    { label: "Roles", href: "/admin/roles" },
    { label: "Audit log", href: "/admin/audit" },
    { label: "Notification templates", href: "/admin/notifications" },
    { label: "Security", href: "/admin/security" },
    { label: "Settings", href: "/admin/settings" },
  ],
};

const bottomNavigation: Record<Audience, string[]> = {
  Customer: ["Home", "Requests", "Bookings", "Messages"],
  Technician: ["Overview", "Available jobs", "Bookings", "Wallet"],
  Admin: ["Overview", "Users", "Bookings", "Disputes"],
};

export function ProductShell({ audience, children }: { audience: Audience; children: React.ReactNode }) {
  const home = audience === "Customer" ? "/app" : `/${audience.toLowerCase()}`;
  const items = navigation[audience];
  return <div className="shell">
    <header className="topbar">
      <div className="topbar-main">
        <Link className="brand" href="/">ServiceHub</Link>
        <form className="search-box" role="search" action="/marketplace" method="get">
          <input className="search-input" name="query" type="search" aria-label="Search marketplace items" placeholder="Search marketplace items" />
          <Button className="search-button" type="submit">Search</Button>
        </form>
        <div className="top-actions">
          <Link className="top-icon" aria-label="Notifications" href={audience === "Customer" ? "/app/notifications" : audience === "Technician" ? "/technician/notifications" : "/admin/notifications"}>Alerts</Link>
          <Link className="language-button" href={audience === "Customer" ? "/account/settings" : audience === "Technician" ? "/technician/settings" : "/admin/settings"}>Settings</Link>
          <Link className="avatar" aria-label={audience === "Admin" ? "Admin security" : audience === "Technician" ? "Technician settings" : "Account settings"} href={audience === "Admin" ? "/admin/security" : audience === "Technician" ? "/technician/settings" : "/account/settings"}>{audience === "Admin" ? "A" : audience === "Technician" ? "T" : "U"}</Link>
          <SignOutButton />
        </div>
      </div>
    </header>
    <div className="dashboard-layout">
      <aside className="dashboard-side-nav" aria-label={`${audience} navigation`}>
        <span className="dashboard-nav-label">{audience} workspace</span>
        {items.map((item, index) => <Link key={item.href} className={`dashboard-nav-link ${index === 0 ? "active" : ""}`} href={item.href}>{item.label}</Link>)}
      </aside>
      <main className="main"><div className="content"><div className="breadcrumb" aria-label="Breadcrumb"><span>Minna</span><AppIcon name="chevron-right" size={16} /><span>{audience}</span><AppIcon name="chevron-right" size={16} /><Link href={home}>Workspace</Link></div>{children}</div></main>
    </div>
    <nav className="mobile-tab-bar" aria-label={`${audience} main navigation`}>
      {items.filter((item) => bottomNavigation[audience].includes(item.label)).map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
    </nav>
  </div>;
}
