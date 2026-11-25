import Link from "next/link";
import { notFound } from "next/navigation";
import { liveApiClient } from "@servicehub/shared/live-api-client";
import { PublicPageShell } from "@/components/public-page-shell";
import { AppIcon } from "@/components/app-icon";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function TechnicianProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let technician;
  try { technician = await liveApiClient.getTechnicianProfile(id); }
  catch { notFound(); }
  return <PublicPageShell><main className="public-container public-content">
    <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/technicians">Technicians</Link><span>/</span><span aria-current="page">{technician.publicName}</span></nav>
    <section className="public-profile-hero"><span className="public-avatar public-avatar-large" aria-hidden="true">{technician.publicName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div className="public-profile-main"><div className="public-profile-name"><h1>{technician.publicName}</h1><span className="public-verified"><AppIcon name="badge-check" size={16} /> Verified</span></div><p>{technician.bio}</p><div className="public-rating"><span><AppIcon name="star" size={16} /> {technician.rating.average.toFixed(1)}</span><span>{technician.rating.count} reviews</span><span>{technician.completedJobCount} jobs completed</span></div></div><Link href={`/app/jobs/new?technician=${encodeURIComponent(technician.id)}`} className="button button-primary">Request a service</Link></section>
    <div className="public-profile-grid"><section className="public-panel"><h2>Services and skills</h2><div className="public-profile-skills">{technician.skills.map((skill) => <div key={skill.service.name} className="public-profile-skill"><span>{skill.service.name}</span><span>{skill.yearsExperience} {skill.yearsExperience === 1 ? "year" : "years"} experience</span></div>)}</div></section><section className="public-panel"><h2>Areas covered</h2><div className="public-area-list">{technician.areas.map((item) => <span key={item.area.name}>{item.area.name}</span>)}</div></section><section className="public-panel public-availability-panel"><h2>Availability</h2><div className="public-availability">{days.map((day) => { const available = technician.weeklyAvailability?.[day] ?? false; return <div key={day} className={available ? "available" : ""}><span>{day}</span><span>{available ? "Available" : "Unavailable"}</span></div>; })}</div></section><aside className="public-panel public-contact-panel"><h2>Tell us what you need</h2><p>Start a service request and include this professional in your request.</p><Link href={`/app/jobs/new?technician=${encodeURIComponent(technician.id)}`} className="button button-primary">Request a service</Link><Link href="/technicians" className="public-back-link"><AppIcon name="arrow-left" size={16} /> Browse other professionals</Link></aside></div>
  </main></PublicPageShell>;
}
