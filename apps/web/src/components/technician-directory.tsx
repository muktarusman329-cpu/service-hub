"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { TechnicianPublic } from "@servicehub/shared/api-client";
import { categories } from "@servicehub/shared/fixtures/categories";
import { minnaAreas } from "@servicehub/shared/fixtures/areas";
import { distanceToTechnicianArea } from "@/components/technician-location";
import type { GeoPoint } from "@/components/technician-location";
import { AppIcon } from "@/components/app-icon";

const LiveTechnicianMap = dynamic(
  () => import("@/components/live-technician-map").then((module) => module.LiveTechnicianMap),
  { ssr: false, loading: () => <div className="live-map-loading">Loading Minna map…</div> },
);

export function TechnicianDirectory({ technicians }: { technicians: TechnicianPublic[] }) {
  const [service, setService] = useState("");
  const [area, setArea] = useState("");
  const [minimumRating, setMinimumRating] = useState("");
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<GeoPoint | null>(null);
  const [locationError, setLocationError] = useState("");
  const [radiusKm, setRadiusKm] = useState(25);
  const [isLocating, setIsLocating] = useState(false);

  const services: Array<{ id: string; name: string }> = [];
  for (const category of categories) {
    if (category.isActive) {
      for (const item of category.services) services.push({ id: item.id, name: item.name });
    }
  }
  const visibleTechnicians = useMemo(() => {
    const filtered = technicians.filter((technician) => {
      const matchesService = !service || technician.skills.some((skill) => skill.service.name === service);
      const matchesArea = !area || technician.areas.some((item) => item.area.name === area);
      const matchesRating = !minimumRating || technician.rating.average >= Number(minimumRating);
      const matchesSearch = !search || [technician.publicName, technician.bio ?? "", ...technician.skills.map((skill) => skill.service.name)]
        .some((value) => value.toLowerCase().includes(search.toLowerCase()));
      const distance = userLocation ? distanceToTechnicianArea(technician, userLocation) : null;
      return matchesService && matchesArea && matchesRating && matchesSearch
        && (!userLocation || (distance !== null && distance <= radiusKm));
    });

    return userLocation
      ? filtered.sort((first, second) =>
        (distanceToTechnicianArea(first, userLocation) ?? Infinity)
        - (distanceToTechnicianArea(second, userLocation) ?? Infinity))
      : filtered;
  }, [area, minimumRating, radiusKm, search, service, technicians, userLocation]);

  function findNearbyTechnicians() {
    if (!navigator.geolocation) {
      setLocationError("Location search is not supported by this browser.");
      return;
    }

    setLocationError("");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setIsLocating(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. Allow location access in your browser to search nearby.",
          2: "Your location is unavailable right now. Try again or browse all Minna technicians.",
          3: "Finding your location timed out. Please try again.",
        };
        setLocationError(messages[error.code] ?? "We couldn’t get your location. Please try again.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 },
    );
  }

  function clearLocation() {
    setUserLocation(null);
    setLocationError("");
  }

  return (
    <div className="public-container public-content">
      <div className="public-page-heading">
        <div>
          <span className="landing-kicker">LOCAL PROFESSIONALS · MINNA</span>
          <h1>Find the right person for the job.</h1>
          <p>Explore local professionals and find someone whose skills fit what you need.</p>
        </div>
        <Link href="/technician/onboarding" className="button button-secondary">Join as a technician</Link>
      </div>

      <section className="public-filter-panel" aria-label="Filter technicians">
        <label className="public-filter-search">
          <span>Search</span>
          <input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or skill" />
        </label>
        <label>
          <span>Service</span>
          <select className="input" value={service} onChange={(event) => setService(event.target.value)}>
            <option value="">All services</option>
            {services.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Area</span>
          <select className="input" value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="">All areas</option>
            {minnaAreas.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Rating</span>
          <select className="input" value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}>
            <option value="">Any rating</option>
            <option value="4.5">4.5 and above</option>
            <option value="4">4 and above</option>
          </select>
        </label>
      </section>

      <section className="live-map-section" aria-labelledby="live-map-heading">
        <div className="live-map-heading">
          <div>
            <span className="landing-kicker">EXPLORE BY LOCATION</span>
            <h2 id="live-map-heading">Find help around you</h2>
            <p>Allow location access to sort nearby professionals and filter the map by distance.</p>
          </div>
          {userLocation ? (
            <div className="live-map-controls">
              <label className="live-map-radius">
                <span>Within</span>
                <select className="input" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                </select>
              </label>
              <button type="button" className="button button-secondary" onClick={clearLocation}>Clear location</button>
            </div>
          ) : (
            <button type="button" className="button button-primary" onClick={findNearbyTechnicians} disabled={isLocating}>
              {isLocating ? "Finding your location…" : <><AppIcon name="map-pin" size={16} /> Use my location</>}
            </button>
          )}
        </div>
        {locationError && <p className="live-map-error" role="alert">{locationError}</p>}
        {userLocation && <p className="live-map-location-status" role="status">Location enabled. Showing closest service areas first, within approximately {radiusKm} km.</p>}
        <LiveTechnicianMap technicians={visibleTechnicians} userLocation={userLocation} />
        <p className="live-map-disclaimer">Demo map: markers show approximate neighbourhoods where technicians offer service, not their live positions. Distances are estimates.</p>
      </section>

      <div className="public-results-heading">
        <h2>{userLocation ? `Technicians within ${radiusKm} km` : "Technicians in Minna"}</h2>
        <span>{visibleTechnicians.length} {visibleTechnicians.length === 1 ? "professional" : "professionals"}</span>
      </div>
      {visibleTechnicians.length ? (
        <div className="public-technician-grid">
          {visibleTechnicians.map((technician) => (
            <Link key={technician.id} href={`/technicians/${technician.id}`} className="public-technician-card">
              <div className="public-technician-card-top">
                <span className="public-avatar" aria-hidden="true">{technician.publicName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <span className="public-verified"><AppIcon name="badge-check" size={16} /> Verified</span>
              </div>
              <h3>{technician.publicName}</h3>
              {userLocation && <span className="public-distance">About {Math.max(1, Math.round(distanceToTechnicianArea(technician, userLocation) ?? 0))} km to service area</span>}
              <p className="public-technician-bio">{technician.bio}</p>
              <div className="public-rating"><span aria-label={`${technician.rating.average} out of 5 stars`}><AppIcon name="star" size={16} /> {technician.rating.average.toFixed(1)}</span><span>{technician.rating.count} reviews</span></div>
              <div className="public-skill-list">{technician.skills.slice(0, 3).map((skill) => <span key={skill.service.name}>{skill.service.name}</span>)}</div>
              <div className="public-technician-card-bottom"><span>{technician.completedJobCount} jobs completed</span><AppIcon name="arrow-right" size={16} /></div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="public-empty-state">
          <span className="public-empty-icon"><AppIcon name="search" /></span>
          <h2>No professionals match those filters</h2>
          <p>Try a different service, area, rating, or search term.</p>
          <button type="button" className="button button-secondary" onClick={() => { setService(""); setArea(""); setMinimumRating(""); setSearch(""); }}>Clear filters</button>
        </div>
      )}
    </div>
  );
}
