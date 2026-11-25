import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { liveApiClient } from "../live-api-client";

export function useQuotes(requestId: string) {
  return useQuery({
    queryKey: ["quotes", requestId],
    queryFn: () => liveApiClient.getQuotes(requestId),
    enabled: !!requestId,
  });
}

export function useQuotesForRequests(requestIds: string[]) {
  return useQueries({
    queries: requestIds.map((requestId) => ({
      queryKey: ["quotes", requestId],
      queryFn: () => liveApiClient.getQuotes(requestId),
    })),
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: Parameters<typeof liveApiClient.createQuote>[1] }) =>
      liveApiClient.createQuote(requestId, data),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", requestId] });
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: Parameters<typeof liveApiClient.updateQuote>[1] }) => liveApiClient.updateQuote(quoteId, data),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", quote.jobRequestId] });
    },
  });
}

export function useWithdrawQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => liveApiClient.withdrawQuote(quoteId),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", quote.jobRequestId] });
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}

export function useAcceptQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: Parameters<typeof liveApiClient.acceptQuote>[1] }) =>
      liveApiClient.acceptQuote(quoteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
