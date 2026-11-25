import { SecurityPanel } from "@/components/security-panel";
import { ProductShell } from "@/components/product-shell";

export default function AdminSecurityPage() {
  return <ProductShell audience="Admin"><SecurityPanel admin /></ProductShell>;
}
