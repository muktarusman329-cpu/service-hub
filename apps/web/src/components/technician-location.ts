import type { TechnicianPublic } from "@servicehub/shared/api-client";

export type GeoPoint = { latitude: number; longitude: number };
export type TechnicianAreaPoint = GeoPoint & { areaName: string; technicians: TechnicianPublic[] };
export const MINNA_CENTER: GeoPoint = { latitude: 9.6139, longitude: 6.5569 };

export function getTechnicianAreaPoints(technicians: TechnicianPublic[]): TechnicianAreaPoint[] {
  const groups = new Map<string, TechnicianPublic[]>();
  for (const technician of technicians) for (const { area } of technician.areas) {
    if (!area.centerLat || !area.centerLng) continue;
    const list = groups.get(area.name) ?? [];
    if (!list.some((item) => item.id === technician.id)) list.push(technician);
    groups.set(area.name, list);
  }
  return [...groups.entries()].flatMap(([areaName, items]) => {
    const area = items[0]?.areas.find((item) => item.area.name === areaName)?.area as (typeof items)[number]["areas"][number]["area"] & { centerLat?: number; centerLng?: number } | undefined;
    return area?.centerLat && area.centerLng ? [{ areaName, latitude: area.centerLat, longitude: area.centerLng, technicians: items }] : [];
  });
}

export function distanceToTechnicianArea(technician: TechnicianPublic, origin: GeoPoint): number | null {
  const distances = technician.areas.flatMap(({ area }) => {
    const coordinates = area as typeof area & { centerLat?: number; centerLng?: number };
    return coordinates.centerLat && coordinates.centerLng ? [haversineDistanceKm(origin, { latitude: coordinates.centerLat, longitude: coordinates.centerLng })] : [];
  });
  return distances.length ? Math.min(...distances) : null;
}

function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
