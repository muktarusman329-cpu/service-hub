import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateReviewDto } from "../api-client";
import { mockApiClient } from "../mock-api-client";

export function usePayments() {
  return useQuery({ queryKey: ["payments"], queryFn: () => mockApiClient.getPayments() });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, result }: { bookingId: string; result: "SUCCEEDED" | "FAILED" | "CASH_DUE" }) =>
      mockApiClient.createPayment(bookingId, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
}

export function useReviews() {
  return useQuery({ queryKey: ["reviews"], queryFn: () => mockApiClient.getReviews() });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewDto) => mockApiClient.createReview(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reviews"] }),
  });
}

export function useNotifications() {
  return useQuery({ queryKey: ["notifications"], queryFn: () => mockApiClient.getNotifications() });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockApiClient.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDisputeBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => mockApiClient.disputeBooking(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
