import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountWorkspaceAction } from "../api-client";
import { liveApiClient } from "../live-api-client";

export function useAccountWorkspace() {
  return useQuery({ queryKey: ["account-workspace"], queryFn: () => liveApiClient.getAccountWorkspace() });
}

export function useUpdateAccountWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AccountWorkspaceAction) => liveApiClient.updateAccountWorkspace(action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-workspace"] }),
  });
}
