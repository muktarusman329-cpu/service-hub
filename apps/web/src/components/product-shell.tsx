import Link from "next/link";
import { Button } from "@servicehub/ui/components";
import { SignOutButton } from "@/components/sign-out-button";
import { AppIcon } from "@/components/app-icon";
import { BrandLogo } from "@/components/brand-logo";

type Audience = "Customer" | "Technician" | "Admin";
type NavigationItem = { label: string; href: string };
const navigation: Record<Audience, NavigationItem[]> = {
  Customer: [{ label: "Home", href: "/app" }, { label: "Requests", href: "/app/jobs" }, { label: "Bookings", href: "/app/bookings" }, { label: "Messages", href: "/app/messages" }],
  Technician: [{ label: "Overview", href: "/technician" }, { label: "Available jobs", href: "/technician/jobs" }, { label: "Bookings", href: "/technician/bookings" }, { label: "Onboarding", href: "/technician/onboarding" }],
  Admin: [{ label: "Overview", href: "/admin" }, { label: "Bookings", href: "/admin/jobs" }, { label: "Marketplace moderation", href: "/admin/marketplace" }, { label: "Security", href: "/admin/security" }],
};
const bottomNavigation: Record<Audience, string[]> = { Customer: ["Home", "Requests", "Bookings", "Messages"], Technician: ["Overview", "Available jobs", "Bookings"], Admin: ["Overview", "Bookings"] };

export function ProductShell({ audience, children }: { audience: Audience; children: React.ReactNode }) {
  const home = audience === "Customer" ? "/app" : `/${audience.toLowerCase()}`;
  const items = navigation[audience];
  return <div className="shell"><header className="topbar"><div className="topbar-main"><BrandLogo className="brand"/><form className="search-box" role="search" action="/marketplace" method="get"><input className="search-input" name="query" type="search" aria-label="Search marketplace items" placeholder="Search marketplace items"/><Button className="search-button" type="submit">Search</Button></form><div className="top-actions"><Link className="language-button" href={audience === "Customer" ? "/account/security" : audience === "Technician" ? "/technician/onboarding" : "/admin/security"}>Account</Link><SignOutButton/></div></div></header><div className="dashboard-layout"><aside className="dashboard-side-nav" aria-label={`${audience} navigation`}><span className="dashboard-nav-label">{audience} workspace</span>{items.map((item,index)=><Link key={item.href} className={`dashboard-nav-link ${index===0?"active":""}`} href={item.href}>{item.label}</Link>)}</aside><main className="main"><div className="content"><div className="breadcrumb" aria-label="Breadcrumb"><span>Minna</span><AppIcon name="chevron-right" size={16}/><span>{audience}</span><AppIcon name="chevron-right" size={16}/><Link href={home}>Workspace</Link></div>{children}</div></main></div><nav className="mobile-tab-bar" aria-label={`${audience} main navigation`}>{items.filter((item)=>bottomNavigation[audience].includes(item.label)).map((item)=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav></div>;
}
