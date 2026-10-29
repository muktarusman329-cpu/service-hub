import { ProductShell } from "@/components/product-shell";
import { RequestWizard } from "@/components/jobs-workspace";
export default function NewJobRequestPage() { return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Request help · Minna</div><h1>Request a service</h1><p className="subtle">A few details help us find the right technician.</p></div></div><RequestWizard /></ProductShell>; }
