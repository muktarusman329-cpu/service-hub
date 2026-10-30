import { ProductShell } from "@/components/product-shell";
import { RequestAndQuotes } from "@/components/customer-app-workspace";
export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Minna · Your request</div><h1>Request and quotes</h1></div></div><RequestAndQuotes id={id} /></ProductShell>; }
