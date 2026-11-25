import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMarketListingDto, MarketplaceFilters, UpdateMarketListingDto } from "../api-client";
import { liveApiClient, liveFetch } from "../live-api-client";

export function useMarketplaceListings(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: ["marketplace-listings", filters],
    queryFn: () => liveApiClient.getMarketplaceListings(filters),
  });
}

export function useMarketplaceListing(id: string) {
  return useQuery({
    queryKey: ["marketplace-listing", id],
    queryFn: () => liveApiClient.getMarketplaceListing(id),
    enabled: Boolean(id),
  });
}

export function useMyMarketplaceListings() {
  return useQuery({
    queryKey: ["marketplace-listings", "mine"],
    queryFn: () => liveApiClient.getMyMarketplaceListings(),
  });
}

export function useCreateMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMarketListingDto) => liveApiClient.createMarketplaceListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}

export function usePendingMarketplaceListings() {
  return useQuery({ queryKey: ["marketplace-listings", "pending-review"], queryFn: () => liveFetch<import("../api-client").MarketListing[]>("/admin/marketplace/pending") });
}

export function useReviewMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PUBLISHED" | "REJECTED" }) =>
      liveApiClient.reviewMarketplaceListing(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing", id] });
    },
  });
}

export function useMarkMarketplaceListingSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liveApiClient.markMarketplaceListingSold(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}

export function useUpdateMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMarketListingDto }) => liveApiClient.updateMarketplaceListing(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing", id] });
    },
  });
}

export function useMarketplaceSellerProfile(id: string) {
  return useQuery({
    queryKey: ["marketplace-seller", id],
    queryFn: () => liveApiClient.getMarketplaceSellerProfile(id),
    enabled: Boolean(id),
  });
}

export function useMarketplaceOrders(role: "BUYER" | "SELLER") {
  return useQuery({ queryKey: ["marketplace-orders", role], queryFn: () => liveApiClient.getMarketplaceOrders(role) });
}

export function useCreateMarketplaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => liveApiClient.createMarketplaceOrder(listingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] }),
  });
}

export function useUpdateMarketplaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED" }) =>
      liveApiClient.updateMarketplaceOrder(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["marketplace-orders"] }),
  });
}

export function useSavedMarketplaceListings() {
  return useQuery({ queryKey: ["marketplace-saved"], queryFn: () => liveApiClient.getSavedMarketplaceListings() });
}

export function useToggleSavedMarketplaceListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => liveApiClient.toggleSavedMarketplaceListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-saved"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
}
