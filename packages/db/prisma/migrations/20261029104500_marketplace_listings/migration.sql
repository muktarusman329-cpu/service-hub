CREATE TYPE "MarketplaceListingStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SOLD');

CREATE TYPE "MarketplaceItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');

CREATE TABLE "market_listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "condition" "MarketplaceItemCondition" NOT NULL,
    "price_kobo" INTEGER NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderation_note" VARCHAR(500),
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "market_listings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "market_listings_city_id_status_created_at_idx"
    ON "market_listings"("city_id", "status", "created_at" DESC);

CREATE INDEX "market_listings_category_status_created_at_idx"
    ON "market_listings"("category", "status", "created_at" DESC);

CREATE INDEX "market_listings_seller_id_created_at_idx"
    ON "market_listings"("seller_id", "created_at" DESC);

ALTER TABLE "market_listings"
    ADD CONSTRAINT "market_listings_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_listings"
    ADD CONSTRAINT "market_listings_city_id_fkey"
    FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "market_listings"
    ADD CONSTRAINT "market_listings_area_id_fkey"
    FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "market_listings"
    ADD CONSTRAINT "market_listings_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
