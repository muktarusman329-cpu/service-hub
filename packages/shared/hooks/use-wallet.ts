import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayoutDto } from "../api-client";
import { mockApiClient } from "../mock-api-client";

export function useWallet() {
  return useQuery({ queryKey: ["wallet"], queryFn: () => mockApiClient.getWallet() });
}

export function useWalletTransactions() {
  return useQuery({ queryKey: ["wallet-transactions"], queryFn: () => mockApiClient.getTransactions() });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayoutDto) => mockApiClient.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["technician-workspace"] });
    },
  });
}
