import { ProductShell } from "@/components/product-shell";
import { RequestFlow } from "@/components/customer-app-workspace";
export default async function NewJobRequestPage({ searchParams }: { searchParams: Promise<{ technician?: string; service?: string; area?: string }> }) {
  const { technician, service, area } = await searchParams;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Request help · Minna</div><h1>Request a service</h1><p className="subtle">A few details help us find the right technician.</p></div></div><RequestFlow directTechnicianId={technician} initialServiceSlug={service} initialAreaSlug={area} /></ProductShell>;
}
