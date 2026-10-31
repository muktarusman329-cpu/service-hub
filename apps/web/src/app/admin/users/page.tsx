import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default function AdminUsersPage() {
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="users" /></ProductShell></AdminGate>;
}
