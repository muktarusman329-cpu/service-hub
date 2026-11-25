import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayoutDto } from "../api-client";
import { liveApiClient } from "../live-api-client";

export function useWallet() {
  return useQuery({ queryKey: ["wallet"], queryFn: () => liveApiClient.getWallet() });
}

export function useWalletTransactions() {
  return useQuery({ queryKey: ["wallet-transactions"], queryFn: () => liveApiClient.getTransactions() });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayoutDto) => liveApiClient.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
    },
  });
}
