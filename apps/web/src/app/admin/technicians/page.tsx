"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge, Card } from "@servicehub/ui/components";
import { AdminGate } from "@/components/admin-gate";
import { ProductShell } from "@/components/product-shell";
import { authFetch } from "@/lib/auth-client";

type Applicant = { id: string; approvalStatus: string; legalName: string | null; submittedAt: string | null; user: { displayName: string | null; phoneVerifiedAt: string | null }; skills: { service: { name: string } }[]; areas: { area: { name: string } }[] };
export default function TechnicianReviewQueue() {
  const [rows, setRows] = useState<Applicant[]>([]); const [error, setError] = useState("Loading applications…"); const [status, setStatus] = useState("");
  const load = useCallback(async () => { try { const query = status ? `?status=${status}` : ""; setRows(await authFetch(`/admin/technicians${query}`)); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not load applications."); } }, [status]);
  useEffect(() => { void load(); }, [load]);
  return <AdminGate><ProductShell audience="Admin"><div className="page-heading"><div><div className="eyebrow">Technician onboarding</div><h1>Applications to review</h1><p className="subtle">Review profiles and identity checks before listing them.</p></div><select aria-label="Filter by status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Needs review</option>{["SUBMITTED","UNDER_REVIEW","CHANGES_REQUESTED","APPROVED","REJECTED"].map(x=><option key={x}>{x}</option>)}</select></div>
    <Card>{error && <p role="status">{error}</p>}{rows.length===0 && !error ? <p className="subtle">No applications in this view yet.</p> : <div className="list">{rows.map(row=><div className="list-row" key={row.id}><div><Link href={`/admin/technicians/${row.id}`} className="list-title">{row.user.displayName || row.legalName || "Technician applicant"}</Link><div className="subtle">{row.skills.map(x=>x.service.name).join(", ") || "No services yet"} · {row.areas.map(x=>x.area.name).join(", ") || "No areas selected"}</div><div className="subtle">Phone {row.user.phoneVerifiedAt ? "verified" : "not verified"}</div></div><Badge tone={row.approvalStatus==="APPROVED"?"success":row.approvalStatus==="REJECTED"?"danger":"warning"}>{row.approvalStatus.replaceAll("_"," ")}</Badge></div>)}</div>}</Card>
  </ProductShell></AdminGate>;
}
