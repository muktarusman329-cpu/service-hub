import { ProductShell } from "@/components/product-shell";
import { NotificationsWorkspace } from "@/components/customer-app-workspace";

export default function UserNotificationsPage() {
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">UPDATES</div><h1>Notifications</h1><p className="subtle">See new quotes, booking changes and account updates.</p></div></div><NotificationsWorkspace /></ProductShell>;
}
