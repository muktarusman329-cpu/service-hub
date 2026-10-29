# Service catalog

Categories and services are records, not UI constants. A category is visible in a city only when its `CityCategoryFlag.enabled` is true. A service is available only when its `CityService.isActive` is true. Price guidance is stored in NGN, returned with the label “Guide only — final price is agreed with the technician,” and never represents a quote or binding price.

The seed currently configures Minna and its nine launch areas, plus Home services, IT support, Delivery and errands, and Thrift and second-hand. The thrift category and its services are disabled for launch. Admin changes require `catalog.manage` and write before/after audit metadata. Public reads use `GET /api/v1/catalog/:city/categories?offset=0&limit=20`; pages are capped at 50 and cached in process for 60 seconds. `GET /api/v1/catalog/:city/areas` supplies selectable areas.

## Data map

`Category` → `Service` → `CityService` (city availability) and `PriceGuidance` (min/max NGN); `CityCategoryFlag` controls category availability. An admin can edit sort order, icon key, slug, name and active state. Category/service CRUD is available through `/api/v1/admin/catalog`.

Price ranges in the seed are launch guidance only. Minna operators should review them before public launch.
