import { ProductShell } from "@/components/product-shell";
import { ChatList } from "@/components/customer-app-workspace";
export default function CustomerMessagesPage() { return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">In-app chat</div><h1>Messages</h1><p className="subtle">Keep job details and updates in one place.</p></div></div><ChatList /></ProductShell>; }
