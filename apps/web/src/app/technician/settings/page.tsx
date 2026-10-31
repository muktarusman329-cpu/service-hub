import { ProductShell } from "@/components/product-shell";
import { TechnicianSettings } from "@/components/technician-app-workspace";

export default function TechnicianSettingsPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">PREFERENCES</div><h1>Technician settings</h1></div></div><TechnicianSettings /></ProductShell>;
}
