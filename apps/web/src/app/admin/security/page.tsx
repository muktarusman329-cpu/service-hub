import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default function AdminSecurityPage() {
  return <ProductShell audience="Admin"><AdminMockWorkspace kind="security" /></ProductShell>;
}
