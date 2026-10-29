import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useQuotes(requestId: string) {
  return useQuery({
    queryKey: ["quotes", requestId],
    queryFn: () => mockApiClient.getQuotes(requestId),
    enabled: !!requestId,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: Parameters<typeof mockApiClient.createQuote>[1] }) =>
      mockApiClient.createQuote(requestId, data),
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", requestId] });
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}

export function useAcceptQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, data }: { quoteId: string; data: Parameters<typeof mockApiClient.acceptQuote>[1] }) =>
      mockApiClient.acceptQuote(quoteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
