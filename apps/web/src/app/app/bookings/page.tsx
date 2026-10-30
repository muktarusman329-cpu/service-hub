import { ProductShell } from "@/components/product-shell";
import { BookingsList } from "@/components/customer-app-workspace";
export default function CustomerBookingsPage() { return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Your service tracker</div><h1>Bookings</h1><p className="subtle">See what has happened and what comes next.</p></div></div><BookingsList /></ProductShell>; }
