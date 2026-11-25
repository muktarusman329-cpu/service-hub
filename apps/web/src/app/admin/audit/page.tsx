import { AdminGate } from "@/components/admin-gate";
import { ProductShell } from "@/components/product-shell";
import { AdminUnavailable } from "@/components/admin-unavailable";

export default function Page() { return <AdminGate><ProductShell audience="Admin"><AdminUnavailable feature="Audit log" /></ProductShell></AdminGate>; }
