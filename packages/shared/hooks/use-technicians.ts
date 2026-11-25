import { useQuery } from "@tanstack/react-query";
import type { TechnicianFilters } from "../api-client";
import { liveApiClient } from "../live-api-client";

export function useTechnicians(citySlug: string, filters?: TechnicianFilters) {
  return useQuery({ queryKey: ["technicians", citySlug, filters], queryFn: () => liveApiClient.getTechnicians(citySlug, filters) });
}

export function useTechnicianProfile(id: string) {
  return useQuery({ queryKey: ["technician", id], queryFn: () => liveApiClient.getTechnicianProfile(id), enabled: !!id });
}
