import { ProductShell } from "@/components/product-shell";
import { PaymentCheckout } from "@/components/customer-app-workspace";

export default async function PaymentCheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">SECURE PAYMENT · DEMO</div><h1>Choose a payment option</h1></div></div><PaymentCheckout bookingId={bookingId} /></ProductShell>;
}
