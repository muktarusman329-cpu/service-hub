import { ProductShell } from "@/components/product-shell";
import { BookingDetail } from "@/components/customer-app-workspace";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">YOUR SERVICE TRACKER</div><h1>Booking details</h1></div></div><BookingDetail id={id} /></ProductShell>;
}
