import { ProductShell } from "@/components/product-shell";
import { JobList } from "@/components/jobs-workspace";
export default function TechnicianJobsPage() { return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">Minna · Your service areas</div><h1>Available requests</h1><p className="subtle">Requests are matched to your services and areas.</p></div></div><JobList audience="technician" /></ProductShell>; }
