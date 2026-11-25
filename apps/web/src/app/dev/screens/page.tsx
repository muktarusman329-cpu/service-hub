import Link from "next/link";

type ScreenStatus = "NOT STARTED" | "IN PROGRESS" | "DONE";
type Screen = { area: string; route: string; name: string; status: ScreenStatus; href?: string };

const screens: Screen[] = [
  { area: "Public", route: "/", name: "Landing page", status: "DONE" },
  { area: "Public", route: "/landing", name: "Landing alias", status: "DONE" },
  { area: "Public", route: "/services", name: "Services directory", status: "IN PROGRESS" },
  { area: "Public", route: "/services/:slug", name: "Service detail", status: "IN PROGRESS", href: "/services/plumbing" },
  { area: "Public", route: "/technicians", name: "Technician directory", status: "IN PROGRESS" },
  { area: "Public", route: "/technicians/:id", name: "Technician profile", status: "IN PROGRESS", href: "/technicians/tech-1" },
  { area: "Marketplace", route: "/marketplace", name: "Browse and filter listings", status: "DONE" },
  { area: "Marketplace", route: "/marketplace/:id", name: "Listing detail and enquiry", status: "DONE", href: "/marketplace/market-desk" },
  { area: "Marketplace", route: "/marketplace/sell", name: "Create and edit listing", status: "DONE" },
  { area: "Marketplace", route: "/marketplace/saved", name: "Saved items", status: "DONE" },
  { area: "Marketplace", route: "/marketplace/orders", name: "Buyer and seller orders", status: "DONE" },
  { area: "Marketplace", route: "/marketplace/sellers/:id", name: "Seller profile", status: "DONE", href: "/marketplace/sellers/seller-amina" },
  { area: "Marketplace", route: "/admin/marketplace", name: "Listing moderation", status: "DONE" },
  { area: "Public", route: "/help", name: "Help center", status: "IN PROGRESS" },
  { area: "Public", route: "/contact", name: "Contact", status: "IN PROGRESS" },
  { area: "Public", route: "/sign-in", name: "Sign in and registration", status: "IN PROGRESS" },
  { area: "Public", route: "/verify", name: "Code verification", status: "IN PROGRESS" },
  { area: "Public", route: "/404", name: "Not found", status: "IN PROGRESS" },
  { area: "Public", route: "/server-error", name: "Server error", status: "IN PROGRESS" },
  { area: "Public", route: "/maintenance", name: "Maintenance", status: "IN PROGRESS" },
  { area: "Public", route: "/offline", name: "Offline", status: "IN PROGRESS" },
  { area: "Public", route: "/privacy", name: "Privacy policy", status: "NOT STARTED" },
  { area: "Public", route: "/terms", name: "Terms", status: "NOT STARTED" },
  { area: "Account", route: "/account/profile", name: "Profile", status: "DONE" },
  { area: "Account", route: "/account/addresses", name: "Saved addresses", status: "DONE" },
  { area: "Account", route: "/account/notifications", name: "Notification preferences", status: "DONE" },
  { area: "Account", route: "/account/settings", name: "Settings", status: "DONE" },
  { area: "Account", route: "/account/security", name: "Security", status: "IN PROGRESS" },
  { area: "Account", route: "/account/onboarding", name: "First-time onboarding", status: "DONE" },
  { area: "User app", route: "/app", name: "Dashboard", status: "DONE" },
  { area: "User app", route: "/app/jobs/new", name: "Three-step request flow", status: "DONE" },
  { area: "User app", route: "/app/jobs/success/:id", name: "Request success", status: "DONE", href: "/app/jobs/success/req-electrician" },
  { area: "User app", route: "/app/jobs", name: "My requests", status: "DONE" },
  { area: "User app", route: "/app/jobs/:id", name: "Request detail and quotes", status: "DONE", href: "/app/jobs/req-electrician" },
  { area: "User app", route: "/app/bookings", name: "Bookings", status: "DONE" },
  { area: "User app", route: "/app/bookings/:id", name: "Booking detail and timeline", status: "DONE", href: "/app/bookings/booking-confirm" },
  { area: "User app", route: "/app/disputes/:id", name: "Dispute detail", status: "DONE", href: "/app/disputes/booking-confirm" },
  { area: "User app", route: "/app/payments", name: "Payment history", status: "DONE" },
  { area: "User app", route: "/app/payments/checkout/:bookingId", name: "Payment checkout", status: "DONE", href: "/app/payments/checkout/booking-active" },
  { area: "User app", route: "/app/payments/receipt/:id", name: "Receipt", status: "DONE", href: "/app/payments/receipt/payment-previous" },
  { area: "User app", route: "/app/payments/failed/:id", name: "Payment failure", status: "DONE", href: "/app/payments/failed/payment-failed" },
  { area: "User app", route: "/app/messages", name: "Conversation list", status: "DONE" },
  { area: "User app", route: "/app/messages/:id", name: "Chat thread", status: "DONE", href: "/app/messages/conversation-active" },
  { area: "User app", route: "/app/reviews", name: "Reviews", status: "DONE" },
  { area: "User app", route: "/app/notifications", name: "Notifications", status: "DONE" },
  { area: "User app", route: "/app/support", name: "Report a problem", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician", name: "Dashboard", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/onboarding", name: "Onboarding and status", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/jobs", name: "Job feed", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/jobs/:id", name: "Request detail and quote", status: "IN PROGRESS", href: "/technician/jobs/req-plumbing" },
  { area: "Technician app", route: "/technician/quotes", name: "My quotes", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/bookings", name: "Active bookings", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/bookings/:id", name: "Booking actions", status: "IN PROGRESS", href: "/technician/bookings/booking-active" },
  { area: "Technician app", route: "/technician/availability", name: "Availability and time off", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/wallet", name: "Wallet and payouts", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/earnings", name: "Earnings and reviews", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/settings", name: "Settings", status: "IN PROGRESS" },
  { area: "Technician app", route: "/technician/notifications", name: "Notifications", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin", name: "Overview", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/users", name: "User table and actions", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/users/:id", name: "User detail", status: "IN PROGRESS", href: "/admin/users/user-1" },
  { area: "Admin console", route: "/admin/roles", name: "Roles and permissions", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/audit", name: "Audit log", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/technicians", name: "Technician review queue", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/technicians/:id", name: "Technician review detail", status: "IN PROGRESS", href: "/admin/technicians/application-tech-1" },
  { area: "Admin console", route: "/admin/catalog", name: "Catalog and area controls", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/jobs", name: "Bookings list", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/jobs/:id", name: "Booking detail", status: "IN PROGRESS", href: "/admin/jobs/booking-active" },
  { area: "Admin console", route: "/admin/jobs/flags", name: "Flagged messages", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/jobs/disputes", name: "Dispute queue", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/payments", name: "Payments, commission and payouts", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/notifications", name: "Notification templates", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/settings", name: "Platform settings", status: "IN PROGRESS" },
  { area: "Admin console", route: "/admin/security", name: "Admin two-factor security", status: "IN PROGRESS" },
  { area: "Developer tools", route: "/dev/design-system", name: "Design system", status: "IN PROGRESS" },
  { area: "Developer tools", route: "/dev/screens", name: "Route status registry", status: "IN PROGRESS" },
];

const statusClass: Record<ScreenStatus, string> = {
  "NOT STARTED": "screen-status-not-started",
  "IN PROGRESS": "screen-status-in-progress",
  DONE: "screen-status-done",
};

export default function DevScreensPage() {
  const grouped = screens.reduce<Record<string, Screen[]>>((acc, screen) => {
    (acc[screen.area] ??= []).push(screen);
    return acc;
  }, {});

  return (
    <main className="dev-screens-page">
      <div className="dev-screens-content">
        <div className="page-heading">
          <div><div className="eyebrow">FRONTEND REVIEW</div><h1>Dev screens</h1><p className="subtle">This registry lists application routes and their current implementation status. Workspaces use live API data or an unavailable state.</p></div>
        </div>
        <div className="dev-status-legend" aria-label="Screen status legend">
          {(["NOT STARTED", "IN PROGRESS", "DONE"] as const).map((status) => <span className={`screen-status ${statusClass[status]}`} key={status}>{status}</span>)}
        </div>
        {Object.entries(grouped).map(([area, items]) => (
          <section className="dev-screens-group" key={area}>
            <h2>{area}</h2>
            <div className="dev-screens-list">
              {items.map((screen) => (
                <div className="dev-screen-row" key={screen.route}>
                  <div className="dev-screen-copy">
                    {screen.href || !screen.route.includes(":") ? <Link href={screen.href ?? screen.route}>{screen.name}</Link> : <span>{screen.name}</span>}
                    <code>{screen.route}</code>
                  </div>
                  <span className={`screen-status ${statusClass[screen.status]}`}>{screen.status}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
