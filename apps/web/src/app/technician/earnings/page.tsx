import { ProductShell } from "@/components/product-shell";
import { TechnicianEarnings } from "@/components/technician-app-workspace";

export default function TechnicianEarningsPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">PERFORMANCE</div><h1>Earnings and reviews</h1></div></div><TechnicianEarnings /></ProductShell>;
}
