import { useQuery } from "@tanstack/react-query";
import { mockApiClient } from "../mock-api-client";

export function useCatalog(citySlug = "minna") {
  return useQuery({
    queryKey: ["catalog", citySlug],
    queryFn: async () => {
      const [categories, services] = await Promise.all([
        mockApiClient.getCategories(citySlug),
        mockApiClient.getServices(citySlug),
      ]);
      return { categories, services };
    },
  });
}
