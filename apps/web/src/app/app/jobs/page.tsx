import { ProductShell } from "@/components/product-shell";
import { JobList } from "@/components/jobs-workspace";
import Link from "next/link";
export default function CustomerJobsPage() { return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Your activity</div><h1>Service requests</h1><p className="subtle">Compare quotes and follow your bookings.</p></div><Link className="button" href="/app/jobs/new">Request a service</Link></div><JobList audience="user" /></ProductShell>; }
