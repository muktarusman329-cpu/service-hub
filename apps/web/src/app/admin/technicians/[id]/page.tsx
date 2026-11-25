import { AdminGate } from "@/components/admin-gate";
import { ProductShell } from "@/components/product-shell";
import { AdminUnavailable } from "@/components/admin-unavailable";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { await params; return <AdminGate><ProductShell audience="Admin"><AdminUnavailable feature="Technician review detail" /></ProductShell></AdminGate>; }
