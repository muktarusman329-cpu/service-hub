import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { liveApiClient } from "../live-api-client";
import { isLiveApiMode } from "../api-mode";

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => isLiveApiMode() ? liveApiClient.getBookings() : Promise.resolve([]),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => liveApiClient.getBooking(id),
    enabled: !!id,
  });
}

export function useChangeBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof liveApiClient.changeBookingStatus>[1] }) =>
      liveApiClient.changeBookingStatus(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof liveApiClient.cancelBooking>[1] }) =>
      liveApiClient.cancelBooking(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRevealContact() {
  return useMutation({
    mutationFn: (bookingId: string) => liveApiClient.revealContact(bookingId),
  });
}
