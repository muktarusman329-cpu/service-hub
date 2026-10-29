import Link from "next/link";
import { SecurityPanel } from "@/components/security-panel";

export default function AdminSecurityPage() { return <main className="content"><div className="breadcrumb"><Link href="/admin">Admin</Link><span>›</span><span>Required security setup</span></div><div className="page-heading"><div><div className="eyebrow">Admin access</div><h1>Set up two-step verification</h1><p className="subtle">Admin tools open after you protect this account with an authenticator app.</p></div></div><SecurityPanel admin /></main>; }
