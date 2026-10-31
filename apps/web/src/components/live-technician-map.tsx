"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { TechnicianPublic } from "@servicehub/shared/api-client";
import { getTechnicianAreaPoints, MINNA_CENTER } from "@/components/technician-location";
import type { GeoPoint } from "@/components/technician-location";

function MapViewport({ center, zoom }: { center: GeoPoint; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.latitude, center.longitude], zoom, { duration: 0.8 });
  }, [center, map, zoom]);

  return null;
}

export function LiveTechnicianMap({
  technicians,
  userLocation,
}: {
  technicians: TechnicianPublic[];
  userLocation: GeoPoint | null;
}) {
  const points = getTechnicianAreaPoints(technicians);
  const center = userLocation ?? MINNA_CENTER;

  return (
    <div className="live-map-frame" aria-label="Map of technicians' approximate service areas">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={userLocation ? 14 : 13}
        scrollWheelZoom={false}
        className="live-map"
      >
        <MapViewport center={center} zoom={userLocation ? 14 : 13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point) => (
          <CircleMarker
            key={point.areaName}
            center={[point.latitude, point.longitude]}
            radius={10}
            pathOptions={{ color: "var(--surface)", weight: 3, fillColor: "var(--map-area)", fillOpacity: 0.95 }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{point.areaName}</strong>
                <span>Approximate service area</span>
                {point.technicians.map((technician) => (
                  <Link key={technician.id} href={`/technicians/${technician.id}`}>
                    {technician.publicName} · {technician.skills[0]?.service.name ?? "Technician"}
                  </Link>
                ))}
              </div>
            </Popup>
          </CircleMarker>
        ))}
        {userLocation && (
          <CircleMarker
            center={[userLocation.latitude, userLocation.longitude]}
            radius={8}
            pathOptions={{ color: "var(--surface)", weight: 3, fillColor: "var(--map-user)", fillOpacity: 1 }}
          >
            <Popup>Your approximate location</Popup>
          </CircleMarker>
        )}
      </MapContainer>
      <div className="live-map-legend" aria-hidden="true">
        <span><i className="map-legend-area" /> Technician service area</span>
        {userLocation && <span><i className="map-legend-user" /> Your location</span>}
      </div>
    </div>
  );
}
