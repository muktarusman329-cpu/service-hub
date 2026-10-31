import Link from "next/link";

type ScreenStatus = "NOT STARTED" | "IN PROGRESS" | "DONE";
type Screen = { area: string; route: string; name: string; status: ScreenStatus; href?: string };

const screens: Screen[] = [
  { area: "Public", route: "/", name: "Landing page", status: "DONE" },
  { area: "Public", route: "/services", name: "Services list", status: "DONE" },
  { area: "Public", route: "/services/:slug", name: "Service detail", status: "DONE" },
  { area: "Public", route: "/marketplace", name: "Minna marketplace", status: "DONE" },
  { area: "Public", route: "/marketplace/:id", name: "Marketplace listing", status: "DONE" },
  { area: "Public", route: "/marketplace/sell", name: "Sell an item", status: "DONE" },
  { area: "Public", route: "/technicians", name: "Browse technicians", status: "DONE" },
  { area: "Public", route: "/technicians/:id", name: "Technician profile", status: "DONE" },
  { area: "Public", route: "/sign-in", name: "Sign in", status: "DONE" },
  { area: "Public", route: "/help", name: "Help center", status: "IN PROGRESS" },
  { area: "Public", route: "/contact", name: "Contact", status: "DONE" },
  { area: "Public", route: "/404", name: "404 page", status: "IN PROGRESS" },
  { area: "Public", route: "/server-error", name: "500 error preview", status: "IN PROGRESS" },
  { area: "Public", route: "/maintenance", name: "Maintenance page", status: "IN PROGRESS" },
  { area: "Public", route: "/offline", name: "Offline page", status: "IN PROGRESS" },
  { area: "Account", route: "/account/profile", name: "Profile", status: "NOT STARTED" },
  { area: "Account", route: "/account/addresses", name: "Saved addresses", status: "NOT STARTED" },
  { area: "Account", route: "/account/notifications", name: "Notification preferences", status: "NOT STARTED" },
  { area: "Account", route: "/account/settings", name: "Settings", status: "NOT STARTED" },
  { area: "Account", route: "/account/security", name: "Security", status: "IN PROGRESS" },
  { area: "Account", route: "/account/onboarding", name: "First-time onboarding", status: "IN PROGRESS" },
  { area: "User", route: "/app", name: "User dashboard", status: "DONE" },
  { area: "User", route: "/app/jobs/new", name: "Request service (3 steps)", status: "DONE" },
  { area: "User", route: "/app/jobs", name: "My requests", status: "DONE" },
  { area: "User", route: "/app/jobs/:id", name: "Request detail and quotes", status: "DONE", href: "/app/jobs/req-electrician" },
  { area: "User", route: "/app/bookings", name: "My bookings", status: "DONE" },
  { area: "User", route: "/app/bookings/:id", name: "Booking detail", status: "DONE", href: "/app/bookings/booking-confirm" },
  { area: "User", route: "/app/messages", name: "Chat list", status: "DONE" },
  { area: "User", route: "/app/messages/:id", name: "Conversation", status: "DONE", href: "/app/messages/conversation-active" },
  { area: "User", route: "/app/payments", name: "Payment history", status: "DONE" },
  { area: "User", route: "/app/payments/checkout/:bookingId", name: "Payment checkout", status: "DONE", href: "/app/payments/checkout/booking-active" },
  { area: "User", route: "/app/payments/receipt/:id", name: "Payment receipt", status: "DONE", href: "/app/payments/receipt/payment-previous" },
  { area: "User", route: "/app/payments/failed/:id", name: "Payment failure", status: "DONE", href: "/app/payments/failed/payment-failed" },
  { area: "User", route: "/app/reviews", name: "My reviews", status: "DONE" },
  { area: "User", route: "/app/notifications", name: "Notifications", status: "DONE" },
  { area: "User", route: "/app/support", name: "Report problem", status: "IN PROGRESS" },
  { area: "Technician", route: "/technician", name: "Technician dashboard", status: "IN PROGRESS" },
  { area: "Technician", route: "/technician/onboarding", name: "Onboarding", status: "IN PROGRESS" },
  { area: "Technician", route: "/technician/jobs", name: "Job feed", status: "IN PROGRESS" },
  { area: "Technician", route: "/technician/availability", name: "Availability calendar", status: "NOT STARTED" },
  { area: "Technician", route: "/technician/wallet", name: "Wallet", status: "NOT STARTED" },
  { area: "Technician", route: "/technician/earnings", name: "Earnings", status: "NOT STARTED" },
  { area: "Admin", route: "/admin", name: "Admin dashboard", status: "IN PROGRESS" },
  { area: "Admin", route: "/admin/users", name: "Users table", status: "NOT STARTED" },
  { area: "Admin", route: "/admin/technicians", name: "Technician review queue", status: "IN PROGRESS" },
  { area: "Admin", route: "/admin/catalog", name: "Catalog management", status: "IN PROGRESS" },
  { area: "Admin", route: "/admin/marketplace", name: "Marketplace review queue", status: "DONE" },
  { area: "Admin", route: "/admin/jobs", name: "Bookings list", status: "IN PROGRESS" },
  { area: "Admin", route: "/admin/jobs/flags", name: "Flagged messages", status: "NOT STARTED" },
  { area: "Admin", route: "/admin/payments", name: "Payments", status: "NOT STARTED" },
  { area: "Admin", route: "/admin/settings", name: "Platform settings", status: "NOT STARTED" },
  { area: "Dev tools", route: "/dev/design-system", name: "Design system", status: "DONE" },
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
          <div>
            <div className="eyebrow">FRONTEND REVIEW</div>
            <h1>Dev screens</h1>
            <p className="subtle">Route status reflects current implementation, not a release approval.</p>
          </div>
        </div>
        <div className="dev-status-legend" aria-label="Screen status legend">
          {(["NOT STARTED", "IN PROGRESS", "DONE"] as const).map((status) => (
            <span className={`screen-status ${statusClass[status]}`} key={status}>{status}</span>
          ))}
        </div>
        {Object.entries(grouped).map(([area, items]) => (
          <section className="dev-screens-group" key={area}>
            <h2>{area}</h2>
            <div className="dev-screens-list">
              {items.map((screen) => (
                <div className="dev-screen-row" key={screen.route}>
                  <div className="dev-screen-copy">
                    {screen.href || !screen.route.includes(":")
                      ? <Link href={screen.href ?? screen.route}>{screen.name}</Link>
                      : <span>{screen.name}</span>}
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
