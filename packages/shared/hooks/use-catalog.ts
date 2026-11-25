import { useQuery } from "@tanstack/react-query";
import { liveFetch } from "../live-api-client";
import type { Category } from "../api-client";

type CatalogService = Category["services"][number];
type CatalogResponse = {
  city: { id: string; slug: string; name: string };
  items: Array<Omit<Category, "sortOrder" | "services"> & { services: CatalogService[] }>;
};

export function useCatalog(citySlug = "minna") {
  return useQuery({
    queryKey: ["catalog", citySlug],
    queryFn: async () => {
      const [catalog, areas] = await Promise.all([
        liveFetch<CatalogResponse>(`/catalog/${encodeURIComponent(citySlug)}/categories`),
        liveFetch<Array<{ id: string; slug: string; name: string }>>(`/catalog/${encodeURIComponent(citySlug)}/areas`),
      ]);
      const categories = catalog.items.map((category, index) => ({ ...category, sortOrder: index }));
      const services = categories.flatMap((category) => category.services);
      return { categories, services, areas, city: catalog.city };
    },
  });
}
