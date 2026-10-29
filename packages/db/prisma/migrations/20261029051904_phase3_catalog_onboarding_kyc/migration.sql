-- AlterEnum
ALTER TYPE "ConsentPurpose" ADD VALUE 'KYC';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'DRAFT';
ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'CHANGES_REQUESTED';
ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "TechnicianApprovalStatus" ADD VALUE 'REACTIVATED';

-- AlterTable
ALTER TABLE "technician_profiles" ADD COLUMN     "bio" VARCHAR(1200),
ADD COLUMN     "city_id" UUID,
ADD COLUMN     "guarantor_consent_at" TIMESTAMPTZ(6),
ADD COLUMN     "guarantor_name" VARCHAR(120),
ADD COLUMN     "guarantor_phone_encrypted" TEXT,
ADD COLUMN     "guarantor_relationship" VARCHAR(80),
ADD COLUMN     "legal_name" VARCHAR(120),
ADD COLUMN     "profile_photo_key" VARCHAR(500),
ADD COLUMN     "submitted_at" TIMESTAMPTZ(6),
ADD COLUMN     "weekly_availability" JSONB;

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "icon_key" VARCHAR(80) NOT NULL DEFAULT 'grid',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "marketplace_only" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "icon_key" VARCHAR(80) NOT NULL DEFAULT 'wrench',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_services" (
    "city_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_services_pkey" PRIMARY KEY ("city_id","service_id")
);

-- CreateTable
CREATE TABLE "price_guidance" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "min_price" DECIMAL(12,2) NOT NULL,
    "max_price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
    "label" VARCHAR(160) NOT NULL DEFAULT 'Guide only — final price is agreed with the technician',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "price_guidance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_category_flags" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "city_category_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_skills" (
    "profile_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("profile_id","service_id")
);

-- CreateTable
CREATE TABLE "technician_areas" (
    "profile_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_areas_pkey" PRIMARY KEY ("profile_id","area_id")
);

-- CreateTable
CREATE TABLE "technician_portfolio" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "caption" VARCHAR(240),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_status_history" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "from_status" "TechnicianApprovalStatus",
    "to_status" "TechnicianApprovalStatus" NOT NULL,
    "actor_id" UUID,
    "reason" VARCHAR(1000),
    "internal_note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_kyc" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "id_type" VARCHAR(30) NOT NULL,
    "id_number_encrypted" TEXT,
    "id_number_blind_index" VARCHAR(64),
    "key_id" VARCHAR(80) NOT NULL,
    "id_photo_key" VARCHAR(500),
    "selfie_key" VARCHAR(500),
    "status" VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    "provider" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    "verification_note" VARCHAR(1000),
    "minimal_verification_record" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retention_at" TIMESTAMPTZ(6),
    "cleared_at" TIMESTAMPTZ(6),

    CONSTRAINT "technician_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inbox_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inbox_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "services_category_id_is_active_sort_order_idx" ON "services"("category_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "services_category_id_slug_key" ON "services"("category_id", "slug");

-- CreateIndex
CREATE INDEX "city_services_service_id_is_active_idx" ON "city_services"("service_id", "is_active");

-- CreateIndex
CREATE INDEX "price_guidance_city_id_idx" ON "price_guidance"("city_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_guidance_city_id_service_id_key" ON "price_guidance"("city_id", "service_id");

-- CreateIndex
CREATE INDEX "city_category_flags_city_id_enabled_idx" ON "city_category_flags"("city_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "city_category_flags_city_id_category_id_key" ON "city_category_flags"("city_id", "category_id");

-- CreateIndex
CREATE INDEX "technician_skills_service_id_profile_id_idx" ON "technician_skills"("service_id", "profile_id");

-- CreateIndex
CREATE INDEX "technician_areas_area_id_profile_id_idx" ON "technician_areas"("area_id", "profile_id");

-- CreateIndex
CREATE INDEX "technician_portfolio_profile_id_sort_order_idx" ON "technician_portfolio"("profile_id", "sort_order");

-- CreateIndex
CREATE INDEX "technician_status_history_profile_id_created_at_idx" ON "technician_status_history"("profile_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "technician_status_history_to_status_created_at_idx" ON "technician_status_history"("to_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "technician_kyc_profile_id_key" ON "technician_kyc"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "technician_kyc_id_number_blind_index_key" ON "technician_kyc"("id_number_blind_index");

-- CreateIndex
CREATE INDEX "technician_kyc_status_submitted_at_idx" ON "technician_kyc"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "technician_kyc_retention_at_idx" ON "technician_kyc"("retention_at");

-- CreateIndex
CREATE INDEX "user_inbox_notifications_user_id_read_at_created_at_idx" ON "user_inbox_notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "technician_profiles_city_id_approval_status_submitted_at_idx" ON "technician_profiles"("city_id", "approval_status", "submitted_at");

-- AddForeignKey
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_services" ADD CONSTRAINT "city_services_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_services" ADD CONSTRAINT "city_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_guidance" ADD CONSTRAINT "price_guidance_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_guidance" ADD CONSTRAINT "price_guidance_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_category_flags" ADD CONSTRAINT "city_category_flags_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_category_flags" ADD CONSTRAINT "city_category_flags_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_areas" ADD CONSTRAINT "technician_areas_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_areas" ADD CONSTRAINT "technician_areas_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_portfolio" ADD CONSTRAINT "technician_portfolio_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_status_history" ADD CONSTRAINT "technician_status_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_status_history" ADD CONSTRAINT "technician_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_kyc" ADD CONSTRAINT "technician_kyc_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inbox_notifications" ADD CONSTRAINT "user_inbox_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
