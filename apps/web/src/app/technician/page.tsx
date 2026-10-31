import { ProductShell } from "@/components/product-shell";
import { TechnicianDashboard } from "@/components/technician-app-workspace";

export default function TechnicianPage() {
  return <ProductShell audience="Technician"><TechnicianDashboard /></ProductShell>;
}
