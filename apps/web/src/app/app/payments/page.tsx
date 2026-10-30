import { ProductShell } from "@/components/product-shell";
import { PaymentHistory } from "@/components/customer-app-workspace";

export default function PaymentsPage() {
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">PAYMENTS · DEMO HISTORY</div><h1>Payments and receipts</h1><p className="subtle">Review payment attempts, cash choices and available receipts.</p></div></div><PaymentHistory /></ProductShell>;
}
