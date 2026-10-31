import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="user-detail" id={id} /></ProductShell></AdminGate>;
}
