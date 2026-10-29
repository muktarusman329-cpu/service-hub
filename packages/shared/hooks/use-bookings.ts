import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => mockApiClient.getBookings(),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => mockApiClient.getBooking(id),
    enabled: !!id,
  });
}

export function useChangeBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mockApiClient.changeBookingStatus>[1] }) =>
      mockApiClient.changeBookingStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof mockApiClient.cancelBooking>[1] }) =>
      mockApiClient.cancelBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRevealContact() {
  return useMutation({
    mutationFn: (bookingId: string) => mockApiClient.revealContact(bookingId),
  });
}
