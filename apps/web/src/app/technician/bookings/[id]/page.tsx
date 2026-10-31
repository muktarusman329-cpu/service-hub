import { ProductShell } from "@/components/product-shell";
import { TechnicianBookingDetail } from "@/components/technician-app-workspace";

export default async function TechnicianBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">BOOKING TRACKER</div><h1>Booking details</h1></div></div><TechnicianBookingDetail id={id} /></ProductShell>;
}
