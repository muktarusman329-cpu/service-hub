import { ProductShell } from "@/components/product-shell";
import { DisputeDetail } from "@/components/customer-app-workspace";

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">BOOKING SUPPORT</div><h1>Dispute details</h1></div></div><DisputeDetail bookingId={id} /></ProductShell>;
}
