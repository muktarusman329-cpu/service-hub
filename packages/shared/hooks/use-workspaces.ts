import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminWorkspaceAction, TechnicianWorkspaceAction } from "../api-client";
import { mockApiClient } from "../mock-api-client";

export function useTechnicianWorkspace() {
  return useQuery({ queryKey: ["technician-workspace"], queryFn: () => mockApiClient.getTechnicianWorkspace() });
}

export function useUpdateTechnicianWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: TechnicianWorkspaceAction) => mockApiClient.updateTechnicianWorkspace(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useAdminWorkspace() {
  return useQuery({ queryKey: ["admin-workspace"], queryFn: () => mockApiClient.getAdminWorkspace() });
}

export function useUpdateAdminWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AdminWorkspaceAction) => mockApiClient.updateAdminWorkspace(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
}
