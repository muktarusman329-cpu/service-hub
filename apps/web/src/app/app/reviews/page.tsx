import { ProductShell } from "@/components/product-shell";
import { ReviewsWorkspace } from "@/components/customer-app-workspace";

export default function ReviewsPage() {
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">YOUR FEEDBACK</div><h1>Reviews</h1><p className="subtle">Review a completed booking and see the feedback you have shared.</p></div></div><ReviewsWorkspace /></ProductShell>;
}
