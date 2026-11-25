import { ProductShell } from "@/components/product-shell";
import { RequestSuccess } from "@/components/customer-app-workspace";

export default async function RequestSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">REQUEST SENT</div><h1>Request confirmation</h1></div></div><RequestSuccess id={id} /></ProductShell>;
}
