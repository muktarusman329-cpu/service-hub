import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="booking-detail" id={id} /></ProductShell></AdminGate>;
}
