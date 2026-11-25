import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateReviewDto } from "../api-client";
import { liveApiClient } from "../live-api-client";

export function usePayments() {
  return useQuery({ queryKey: ["payments"], queryFn: () => liveApiClient.getPayments() });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, result }: { bookingId: string; result: "SUCCEEDED" | "FAILED" | "CASH_DUE" }) =>
      liveApiClient.createPayment(bookingId, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useReviews() {
  return useQuery({ queryKey: ["reviews"], queryFn: () => liveApiClient.getReviews() });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewDto) => liveApiClient.createReview(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => liveApiClient.getNotifications() });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liveApiClient.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDisputeBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => liveApiClient.disputeBooking(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
