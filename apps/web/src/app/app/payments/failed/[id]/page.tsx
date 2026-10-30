import { ProductShell } from "@/components/product-shell";
import { PaymentOutcome } from "@/components/customer-app-workspace";

export default async function PaymentFailedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">PAYMENT RECORD</div><h1>Payment result</h1></div></div><PaymentOutcome id={id} failed /></ProductShell>;
}
