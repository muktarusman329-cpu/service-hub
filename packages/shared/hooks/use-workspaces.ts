import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminWorkspaceAction, TechnicianWorkspaceAction } from "../api-client";
import { liveApiClient } from "../live-api-client";

export function useTechnicianWorkspace() {
  return useQuery({ queryKey: ["technician-workspace"], queryFn: () => liveApiClient.getTechnicianWorkspace() });
}

export function useUpdateTechnicianWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: TechnicianWorkspaceAction) => liveApiClient.updateTechnicianWorkspace(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useAdminWorkspace() {
  return useQuery({ queryKey: ["admin-workspace"], queryFn: () => liveApiClient.getAdminWorkspace() });
}

export function useUpdateAdminWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AdminWorkspaceAction) => liveApiClient.updateAdminWorkspace(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
}
