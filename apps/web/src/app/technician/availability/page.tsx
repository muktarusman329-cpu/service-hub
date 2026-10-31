import { ProductShell } from "@/components/product-shell";
import { TechnicianSchedule } from "@/components/technician-app-workspace";

export default function TechnicianAvailabilityPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">SCHEDULE</div><h1>Availability and time off</h1></div></div><TechnicianSchedule /></ProductShell>;
}
