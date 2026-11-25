"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { TechnicianPublic } from "@servicehub/shared/api-client";
import { useCatalog } from "@servicehub/shared/hooks/use-catalog";
import { distanceToTechnicianArea } from "@/components/technician-location";
import type { GeoPoint } from "@/components/technician-location";
import { AppIcon } from "@/components/app-icon";

const LiveTechnicianMap = dynamic(() => import("@/components/live-technician-map").then((module) => module.LiveTechnicianMap), { ssr: false, loading: () => <div className="live-map-loading">Loading map…</div> });

export function TechnicianDirectory({ technicians }: { technicians: TechnicianPublic[] }) {
  const catalog = useCatalog("minna");
  const [service, setService] = useState("");
  const [area, setArea] = useState("");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationError, setLocationError] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [isLocating, setIsLocating] = useState(false);
  const services = catalog.data?.services.filter((item) => item.isActive) ?? [];
  const areas = catalog.data?.areas ?? [];
  const visibleTechnicians = useMemo(() => {
    const filtered = technicians.filter((technician) => {
      const serviceOk = !service || technician.skills.some((skill) => skill.service.name === service);
      const areaOk = !area || technician.areas.some((item) => item.area.name === area);
      const textOk = !search || [technician.publicName, technician.bio ?? "", ...technician.skills.map((skill) => skill.service.name)].some((value) => value.toLowerCase().includes(search.toLowerCase()));
      const distance = userLocation ? distanceToTechnicianArea(technician, userLocation) : null;
      return serviceOk && areaOk && textOk && (!userLocation || (distance !== null && distance <= radiusKm));
    });
    return userLocation ? filtered.sort((a, b) => (distanceToTechnicianArea(a, userLocation) ?? Infinity) - (distanceToTechnicianArea(b, userLocation) ?? Infinity)) : filtered;
  }, [area, radiusKm, search, service, technicians, userLocation]);
  function locate() {
    if (!navigator.geolocation) { setLocationError("Location search is not supported by this browser."); return; }
    setIsLocating(true); setLocationError("");
    navigator.geolocation.getCurrentPosition((position) => { setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); setIsLocating(false); }, () => { setLocationError("Your location could not be accessed."); setIsLocating(false); }, { timeout: 12000, maximumAge: 60000 });
  }
  return <div className="public-container public-content"><div className="public-page-heading"><div><span className="landing-kicker">LOCAL PROFESSIONALS · MINNA</span><h1>Find the right person for the job.</h1></div><Link href="/technician/onboarding" className="button button-secondary">Join as a technician</Link></div><section className="public-filter-panel" aria-label="Filter technicians"><label className="public-filter-search"><span>Search</span><input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or skill" /></label><label><span>Service</span><select className="input" value={service} onChange={(e) => setService(e.target.value)}><option value="">All services</option>{services.map((item) => <option key={item.id}>{item.name}</option>)}</select></label><label><span>Area</span><select className="input" value={area} onChange={(e) => setArea(e.target.value)}><option value="">All areas</option>{areas.map((item) => <option key={item.id}>{item.name}</option>)}</select></label></section><section className="live-map-section"><div className="live-map-heading"><div><h2>Technician service areas</h2><p>Markers show published service areas, not live technician locations.</p></div>{userLocation ? <div className="live-map-controls"><select className="input" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option><option value={50}>50 km</option></select><button className="button button-secondary" onClick={() => setUserLocation(null)}>Clear location</button></div> : <button className="button button-primary" onClick={locate} disabled={isLocating}>{isLocating ? "Locating…" : "Use my location"}</button>}</div>{locationError && <p role="alert">{locationError}</p>}<LiveTechnicianMap technicians={visibleTechnicians} userLocation={userLocation} /></section><div className="public-results-heading"><h2>Technicians in Minna</h2><span>{visibleTechnicians.length}</span></div>{visibleTechnicians.length ? <div className="public-technician-grid">{visibleTechnicians.map((tech) => <Link key={tech.id} href={`/technicians/${tech.id}`} className="public-technician-card"><div className="public-technician-card-top"><span className="public-avatar">{tech.publicName.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>{tech.verified && <span className="public-verified"><AppIcon name="badge-check" size={16} /> Verified</span>}</div><h3>{tech.publicName}</h3><p>{tech.bio}</p><div className="public-skill-list">{tech.skills.slice(0, 3).map((item) => <span key={item.service.id}>{item.service.name}</span>)}</div><div className="public-technician-card-bottom"><span>{tech.areas.map((x) => x.area.name).join(", ")}</span><AppIcon name="arrow-right" size={16} /></div></Link>)}</div> : <div className="public-empty-state"><h2>No professionals match those filters</h2><p>Try a different service, area, or search term.</p><button className="button button-secondary" onClick={() => { setService(""); setArea(""); setSearch(""); }}>Clear filters</button></div>}</div>;
}
