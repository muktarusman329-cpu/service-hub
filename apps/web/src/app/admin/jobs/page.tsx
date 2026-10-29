import { ProductShell } from "@/components/product-shell";
import { JobList } from "@/components/jobs-workspace";
export default function AdminJobsPage() { return <ProductShell audience="Admin"><div className="page-heading"><div><div className="eyebrow">Operations</div><h1>Bookings</h1><p className="subtle">Review current status and recent history.</p></div></div><JobList audience="admin" /></ProductShell>; }
