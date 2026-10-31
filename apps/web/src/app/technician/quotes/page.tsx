import { ProductShell } from "@/components/product-shell";
import { TechnicianMyQuotes } from "@/components/technician-app-workspace";

export default function TechnicianQuotesPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">YOUR OFFERS</div><h1>My quotes</h1></div></div><TechnicianMyQuotes /></ProductShell>;
}
