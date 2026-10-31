import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default function CatalogAdminPage() {
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="catalog" /></ProductShell></AdminGate>;
}
