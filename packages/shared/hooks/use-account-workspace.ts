import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountWorkspaceAction } from "../api-client";
import { mockApiClient } from "../mock-api-client";

export function useAccountWorkspace() {
  return useQuery({ queryKey: ["account-workspace"], queryFn: () => mockApiClient.getAccountWorkspace() });
}

export function useUpdateAccountWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AccountWorkspaceAction) => mockApiClient.updateAccountWorkspace(action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account-workspace"] }),
  });
}
