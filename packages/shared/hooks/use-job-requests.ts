import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveApiClient, liveFetch } from "../live-api-client";
import { isLiveApiMode } from "../api-mode";

export function useJobRequests(audience?: "technician") {
  return useQuery({
    queryKey: ["job-requests", audience ?? "customer"],
    queryFn: () => !isLiveApiMode() ? Promise.resolve([]) : audience === "technician" ? liveFetch<import("../api-client").JobRequest[]>("/jobs/technician/feed") : liveApiClient.getJobRequests(),
  });
}

export function useJobRequest(id: string) {
  return useQuery({
    queryKey: ["job-request", id],
    queryFn: () => liveApiClient.getJobRequest(id),
    enabled: !!id,
  });
}

export function useCreateJobRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof liveApiClient.createJobRequest>[0]) =>
      liveApiClient.createJobRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}

export function useUpdateJobRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof liveApiClient.updateJobRequest>[1] }) =>
      liveApiClient.updateJobRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
      queryClient.invalidateQueries({ queryKey: ["job-request", id] });
    },
  });
}

export function useCancelJobRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof liveApiClient.cancelJobRequest>[1] }) =>
      liveApiClient.cancelJobRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-requests"] });
    },
  });
}
