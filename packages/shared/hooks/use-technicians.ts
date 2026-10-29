import { useQuery } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useTechnicians(citySlug: string, filters?: Parameters<typeof mockApiClient.getTechnicians>[1]) {
  return useQuery({
    queryKey: ["technicians", citySlug, filters],
    queryFn: () => mockApiClient.getTechnicians(citySlug, filters),
  });
}

export function useTechnicianProfile(id: string) {
  return useQuery({
    queryKey: ["technician", id],
    queryFn: () => mockApiClient.getTechnicianProfile(id),
    enabled: !!id,
  });
}
