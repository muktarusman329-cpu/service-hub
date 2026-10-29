import Link from "next/link";
import { SecurityPanel } from "@/components/security-panel";

export default function AccountSecurityPage() { return <main className="content"><div className="breadcrumb"><Link href="/app">Home</Link><span>›</span><span>Account security</span></div><div className="page-heading"><div><div className="eyebrow">Your account</div><h1>Security and sign-in</h1></div></div><SecurityPanel /></main>; }
