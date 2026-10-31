import { ProductShell } from "@/components/product-shell";
import { TechnicianBookingList } from "@/components/technician-app-workspace";

export default function TechnicianBookingsPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">YOUR WORK</div><h1>Active bookings</h1></div></div><TechnicianBookingList /></ProductShell>;
}
