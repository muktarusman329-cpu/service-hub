import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
import { ProductShell } from "@/components/product-shell";

export default function TechnicianReviewQueue() {
  return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="technician-review" /></ProductShell></AdminGate>;
}
