import { ProductShell } from "@/components/product-shell";
import { AdminGate } from "@/components/admin-gate";
import { AdminMockWorkspace } from "@/components/admin-mock-workspace";
export default function AdminPage() { return <AdminGate><ProductShell audience="Admin"><AdminMockWorkspace kind="overview" /></ProductShell></AdminGate>; }
