import { ProductShell } from "@/components/product-shell";
import { CustomerSupport } from "@/components/customer-app-workspace";

export default function SupportPage() {
  return <ProductShell audience="Customer"><CustomerSupport /></ProductShell>;
}
