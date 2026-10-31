import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default function AdminDisputesPage() {
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="disputes" /></ProductShell></AdminGate>;
}
