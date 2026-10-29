import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useJobRequests() {
  return useQuery({
    queryKey: ["job-requests"],
    queryFn: () => mockApiClient.getJobRequests(),
  });
}

export function useJobRequest(id: string) {
  return useQuery({
    queryKey: ["job-request", id],
    queryFn: () => mockApiClient.getJobRequest(id),
    enabled: !!id,
  });
}

export function useCreateJobRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof mockApiClient.createJobRequest>[0]) =>
      mockApiClient.createJobRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}

export function useCancelJobRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mockApiClient.cancelJobRequest>[1] }) =>
      mockApiClient.cancelJobRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}
