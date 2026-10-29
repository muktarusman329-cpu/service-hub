import Link from "next/link";

const screens = [
  { area: "Public", route: "/", name: "Landing page", status: true },
  { area: "Public", route: "/services", name: "Services list", status: true },
  { area: "Public", route: "/services/:slug", name: "Service detail", status: true },
  { area: "Public", route: "/marketplace", name: "Minna marketplace", status: true },
  { area: "Public", route: "/marketplace/:id", name: "Marketplace listing", status: true },
  { area: "Public", route: "/marketplace/sell", name: "Sell an item", status: true },
  { area: "Public", route: "/technicians", name: "Browse technicians", status: true },
  { area: "Public", route: "/technicians/:id", name: "Technician profile", status: true },
  { area: "Public", route: "/sign-in", name: "Sign in", status: true },
  { area: "Public", route: "/help", name: "Help center", status: true },
  { area: "Public", route: "/contact", name: "Contact", status: true },
  { area: "Public", route: "/404", name: "404 page", status: true },
  { area: "Public", route: "/server-error", name: "500 error preview", status: true },
  { area: "Public", route: "/maintenance", name: "Maintenance page", status: true },
  { area: "Public", route: "/offline", name: "Offline page", status: true },
  { area: "Account", route: "/account/profile", name: "Profile", status: false },
  { area: "Account", route: "/account/addresses", name: "Saved addresses", status: false },
  { area: "Account", route: "/account/notifications", name: "Notification preferences", status: false },
  { area: "Account", route: "/account/settings", name: "Settings", status: false },
  { area: "Account", route: "/account/security", name: "Security", status: true },
  { area: "Account", route: "/account/onboarding", name: "First-time onboarding", status: false },
  { area: "User", route: "/app", name: "User dashboard", status: false },
  { area: "User", route: "/app/jobs/new", name: "Request service (step 1)", status: false },
  { area: "User", route: "/app/jobs", name: "My requests", status: true },
  { area: "User", route: "/app/jobs/:id", name: "Request detail", status: false },
  { area: "User", route: "/app/bookings", name: "My bookings", status: true },
  { area: "User", route: "/app/bookings/:id", name: "Booking detail", status: false },
  { area: "User", route: "/app/messages", name: "Chat list", status: true },
  { area: "User", route: "/app/messages/:id", name: "Conversation", status: false },
  { area: "User", route: "/app/reviews", name: "My reviews", status: false },
  { area: "User", route: "/app/support", name: "Report problem", status: false },
  { area: "Technician", route: "/technician", name: "Technician dashboard", status: true },
  { area: "Technician", route: "/technician/onboarding", name: "Onboarding", status: true },
  { area: "Technician", route: "/technician/jobs", name: "Job feed", status: true },
  { area: "Technician", route: "/technician/availability", name: "Availability calendar", status: false },
  { area: "Technician", route: "/technician/wallet", name: "Wallet", status: false },
  { area: "Technician", route: "/technician/earnings", name: "Earnings", status: false },
  { area: "Admin", route: "/admin", name: "Admin dashboard", status: true },
  { area: "Admin", route: "/admin/users", name: "Users table", status: false },
  { area: "Admin", route: "/admin/technicians", name: "Technician review queue", status: true },
  { area: "Admin", route: "/admin/catalog", name: "Catalog management", status: true },
  { area: "Admin", route: "/admin/marketplace", name: "Marketplace review queue", status: true },
  { area: "Admin", route: "/admin/jobs", name: "Bookings list", status: true },
  { area: "Admin", route: "/admin/jobs/flags", name: "Flagged messages", status: false },
  { area: "Admin", route: "/admin/payments", name: "Payments", status: false },
  { area: "Admin", route: "/admin/settings", name: "Platform settings", status: false },
  { area: "Dev tools", route: "/dev/design-system", name: "Design system", status: true },
];

export default function DevScreensPage() {
  const grouped = screens.reduce((acc, screen) => {
    if (!acc[screen.area]) acc[screen.area] = [];
    acc[screen.area].push(screen);
    return acc;
  }, {} as Record<string, typeof screens>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dev Screens</h1>
        <p className="text-gray-600 mb-8">Click through all screens to review the UI</p>
        
        {Object.entries(grouped).map(([area, items]) => (
          <div key={area} className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{area}</h2>
            <div className="bg-white border rounded-lg overflow-hidden">
              {items.map((screen) => (
                <Link
                  key={screen.route}
                  href={screen.route.includes(":") ? "#" : screen.route}
                  className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <div>
                    <span className="font-medium text-gray-900">{screen.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{screen.route}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={screen.status}
                    readOnly
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
