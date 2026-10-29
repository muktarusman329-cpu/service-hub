"use client";
import { use, useEffect, useState } from "react";
import { Button, Card } from "@servicehub/ui/components";
import { AdminGate } from "@/components/admin-gate";
import { ProductShell } from "@/components/product-shell";
import { authFetch } from "@/lib/auth-client";

type Detail = {
  legalName: string | null;
  bio: string | null;
  approvalStatus: string;
  user: { displayName: string | null; phoneVerifiedAt: string | null };
  skills: { serviceId: string; yearsExperience: number; service: { name: string } }[];
  areas: { area: { name: string } }[];
  portfolio: { id: string; caption: string | null }[];
};
type KycSummary = { id: string; idType: string; idNumberMasked: string; status: string };

export default function TechnicianReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [row, setRow] = useState<Detail | null>(null);
  const [kyc, setKyc] = useState<KycSummary | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("Loading application…");
  useEffect(() => {
    void Promise.all([authFetch(`/admin/technicians/${id}`), authFetch(`/admin/technicians/${id}/kyc`)]).then(([profile, identity]) => {
      setRow(profile as Detail); setKyc(identity as KycSummary); setMessage("");
    }).catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Could not load this application."));
  }, [id]);
  async function review(status: string) {
    try {
      await authFetch(`/admin/technicians/${id}/review`, { method: "POST", body: JSON.stringify({ status, reason, internalNote: "" }) });
      setMessage(`Application updated: ${status.toLowerCase().replaceAll("_", " ")}.`);
      setRow(current => current ? { ...current, approvalStatus: status } : current);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not update application."); }
  }
  async function openDocument(kind: "ID_PHOTO" | "SELFIE") {
    try { const result = await authFetch(`/admin/technicians/${id}/kyc/documents/${kind}`); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not open the document."); }
  }
  return <AdminGate><ProductShell audience="Admin">
    <div className="page-heading"><div><div className="eyebrow">Applications / Review</div><h1>{row?.user.displayName || "Technician application"}</h1><p className="subtle" role="status">{message}</p></div></div>
    <div className="grid-2"><div className="stack"><Card><h2>Profile</h2><p>{row?.legalName}</p><p>{row?.bio}</p><p>Phone {row?.user.phoneVerifiedAt ? "verified" : "not verified"}</p><h3>Services</h3>{row?.skills.map(x => <p key={x.serviceId}>{x.service.name} · {x.yearsExperience} years</p>)}<h3>Areas</h3><p>{row?.areas.map(x => x.area.name).join(", ")}</p><h3>Recent work</h3>{row?.portfolio.map(x => <p key={x.id}>{x.caption || "Portfolio photo submitted"}</p>)}<p>Status: {row?.approvalStatus}</p></Card>
      <Card><h2>Review decision</h2><label>Reason (required for changes or rejection)<textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="button-row"><Button onClick={() => void review("UNDER_REVIEW")}>Start review</Button><Button onClick={() => void review("CHANGES_REQUESTED")} tone="secondary">Request changes</Button><Button onClick={() => void review("REJECTED")} tone="secondary">Reject</Button><Button onClick={() => void review("APPROVED")}>Approve</Button></div></Card></div>
      <Card><h2>Identity check</h2><p>Type: {kyc?.idType || "Not submitted"}</p><p>Number: {kyc?.idNumberMasked || "—"}</p><p>Status: {kyc?.status || "—"}</p>{kyc?.id && <div className="stack"><Button tone="secondary" onClick={() => void openDocument("ID_PHOTO")}>View ID photo</Button><Button tone="secondary" onClick={() => void openDocument("SELFIE")}>View selfie</Button></div>}</Card>
    </div>
  </ProductShell></AdminGate>;
}
