import { ProductShell } from "@/components/product-shell";
import { ConversationView } from "@/components/customer-app-workspace";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">IN-APP CHAT</div><h1>Conversation</h1></div></div><ConversationView id={id} /></ProductShell>;
}
