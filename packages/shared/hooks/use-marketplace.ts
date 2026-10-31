import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMarketListingDto, MarketplaceFilters, UpdateMarketListingDto } from "../api-client";
import { mockApiClient } from "../mock-api-client";

export function useMarketplaceListings(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: ["marketplace-listings", filters],
    queryFn: () => mockApiClient.getMarketplaceListings(filters),
  });
}

export function useMarketplaceListing(id: string) {
  return useQuery({
    queryKey: ["marketplace-listing", id],
    queryFn: () => mockApiClient.getMarketplaceListing(id),
    enabled: Boolean(id),
  });
}

export function useMyMarketplaceListings() {
  return useQuery({
    queryKey: ["marketplace-listings", "mine"],
    queryFn: () => mockApiClient.getMyMarketplaceListings(),
  });
}

export function useCreateMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMarketListingDto) => mockApiClient.createMarketplaceListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}

export function useReviewMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "REJECTED" }) =>
      mockApiClient.reviewMarketplaceListing(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing", id] });
    },
  });
}

export function useMarkMarketplaceListingSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockApiClient.markMarketplaceListingSold(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}

export function useUpdateMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarketListingDto }) => mockApiClient.updateMarketplaceListing(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing", id] });
    },
  });
}

export function useMarketplaceSellerProfile(id: string) {
  return useQuery({
    queryKey: ["marketplace-seller", id],
    queryFn: () => mockApiClient.getMarketplaceSellerProfile(id),
    enabled: Boolean(id),
  });
}

export function useMarketplaceOrders(role: "BUYER" | "SELLER") {
  return useQuery({ queryKey: ["marketplace-orders", role], queryFn: () => mockApiClient.getMarketplaceOrders(role) });
}

export function useCreateMarketplaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => mockApiClient.createMarketplaceOrder(listingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] }),
  });
}

export function useUpdateMarketplaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED" }) =>
      mockApiClient.updateMarketplaceOrder(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] }),
  });
}

export function useSavedMarketplaceListings() {
  return useQuery({ queryKey: ["marketplace-saved"], queryFn: () => mockApiClient.getSavedMarketplaceListings() });
}

export function useToggleSavedMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mockApiClient.toggleSavedMarketplaceListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-saved"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}
