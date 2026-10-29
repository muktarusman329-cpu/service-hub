import type { TechnicianPublic } from "@servicehub/shared/api-client";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type TechnicianAreaPoint = GeoPoint & {
  areaName: string;
  technicians: TechnicianPublic[];
};

export const MINNA_CENTER: GeoPoint = { latitude: 9.6139, longitude: 6.5569 };

const serviceAreaCoordinates: Record<string, GeoPoint> = {
  Bosso: { latitude: 9.649, longitude: 6.531 },
  Tunga: { latitude: 9.627, longitude: 6.574 },
  Chanchaga: { latitude: 9.608, longitude: 6.548 },
  Maitumbi: { latitude: 9.65, longitude: 6.584 },
  Kpakungu: { latitude: 9.581, longitude: 6.551 },
  "Gidan Kwano": { latitude: 9.532, longitude: 6.453 },
  "Keteren Gwari": { latitude: 9.624, longitude: 6.529 },
  "Barkin Sale": { latitude: 9.601, longitude: 6.58 },
  "Dutsen Kura": { latitude: 9.632, longitude: 6.599 },
};

export function getTechnicianAreaPoints(technicians: TechnicianPublic[]): TechnicianAreaPoint[] {
  const areas = new Map<string, TechnicianAreaPoint>();

  for (const technician of technicians) {
    for (const { area } of technician.areas) {
      const coordinates = serviceAreaCoordinates[area.name];
      if (!coordinates) continue;

      const existing = areas.get(area.name);
      if (existing) {
        if (!existing.technicians.some((item) => item.id === technician.id)) existing.technicians.push(technician);
      } else {
        areas.set(area.name, { ...coordinates, areaName: area.name, technicians: [technician] });
      }
    }
  }

  return [...areas.values()];
}

export function distanceToTechnicianArea(technician: TechnicianPublic, origin: GeoPoint): number | null {
  const distances = technician.areas
    .map(({ area }) => serviceAreaCoordinates[area.name])
    .filter((point): point is GeoPoint => point !== undefined)
    .map((point) => haversineDistanceKm(origin, point));

  return distances.length ? Math.min(...distances) : null;
}

function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
