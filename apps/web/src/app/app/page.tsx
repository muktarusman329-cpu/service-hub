import { Badge, Card } from "@servicehub/ui/components";
import { ProductShell } from "@/components/product-shell";
import Link from "next/link";
export default function CustomerPage() { return <ProductShell audience="Customer"><div className="page-heading"><div><div className="eyebrow">Minna</div><h1>What can we help with?</h1><div className="subtle">Choose a service to see local options.</div></div><Link href="/app/jobs/new" className="button">Request a service</Link></div>
  <div className="grid-4">{[["Home services","Repairs and help at home"],["IT support","Phones, laptops and Wi-Fi"],["Delivery","Local pickups and errands"],["Second-hand","Useful finds nearby"]].map(([name, desc])=><Card key={name}><div className="eyebrow">Explore</div><h2 style={{ marginTop: 8 }}>{name}</h2><p className="subtle">{desc}</p></Card>)}</div>
  <div className="grid-2"><Card><div className="section-head"><h2>Getting started</h2><Badge>Minna areas</Badge></div><p className="subtle">Tell us what you need and where you are. Your nearest landmark helps a technician find you.</p><Link href="/app/jobs/new" className="button button-secondary">Post a request</Link></Card><Card><h2>Recent activity</h2><p className="subtle">Your bookings and messages will appear here.</p><Link href="/app/jobs" className="text-link">View your requests</Link></Card></div>
</ProductShell>; }
