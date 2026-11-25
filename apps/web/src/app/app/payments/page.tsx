import { ProductShell } from "@/components/product-shell";
import { PaymentHistory } from "@/components/customer-app-workspace";

export default function PaymentsPage() {
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">PAYMENTS</div><h1>Payments and receipts</h1><p className="subtle">Payment history from completed transactions.</p></div></div><PaymentHistory /></ProductShell>;
}
