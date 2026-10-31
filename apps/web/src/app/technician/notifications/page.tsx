import { ProductShell } from "@/components/product-shell";
import { NotificationsWorkspace } from "@/components/customer-app-workspace";

export default function TechnicianNotificationsPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">UPDATES</div><h1>Notifications</h1></div></div><NotificationsWorkspace /></ProductShell>;
}
