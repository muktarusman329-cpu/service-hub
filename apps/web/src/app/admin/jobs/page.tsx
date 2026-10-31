import { ProductShell } from "@/components/product-shell";
import { JobList } from "@/components/jobs-workspace";
import { AdminGate } from "@/components/admin-gate";
export default function AdminJobsPage() { return <AdminGate><ProductShell audience="Admin"><div className="page-heading"><div><div className="eyebrow">Operations</div><h1>Bookings</h1><p className="subtle">Review current status and recent history.</p></div></div><JobList audience="admin" /></ProductShell></AdminGate>; }
