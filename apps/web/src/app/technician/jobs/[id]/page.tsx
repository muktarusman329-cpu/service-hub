import { ProductShell } from "@/components/product-shell";
import { TechnicianRequestDetail } from "@/components/technician-app-workspace";

export default async function TechnicianRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">MATCHED REQUEST</div><h1>Request details</h1></div></div><TechnicianRequestDetail id={id} /></ProductShell>;
}
