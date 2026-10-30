import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMarketListingDto, MarketplaceFilters } from "../api-client";
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
