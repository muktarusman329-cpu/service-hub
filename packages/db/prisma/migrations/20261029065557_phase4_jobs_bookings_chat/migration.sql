-- CreateEnum
CREATE TYPE "JobRequestStatus" AS ENUM ('OPEN', 'DIRECTED', 'QUOTED', 'ACCEPTED', 'CANCELLED_BY_USER', 'CANCELLED_BY_TECHNICIAN', 'EXPIRED', 'COMPLETED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RequestUrgency" AS ENUM ('STANDARD', 'URGENT');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'NOT_SELECTED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'QUOTED', 'ACCEPTED', 'TECHNICIAN_EN_ROUTE', 'IN_PROGRESS', 'COMPLETED_PENDING_CONFIRMATION', 'COMPLETED', 'CANCELLED_BY_USER', 'CANCELLED_BY_TECHNICIAN', 'EXPIRED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BookingPaymentMethod" AS ENUM ('ONLINE', 'CASH');

-- CreateEnum
CREATE TYPE "BookingActorRole" AS ENUM ('USER', 'TECHNICIAN', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('USER', 'TECHNICIAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "MessageFlagStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "job_requests" (
    "id" VARCHAR(26) NOT NULL,
    "customer_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,
    "direct_technician_profile_id" UUID,
    "nearest_landmark" VARCHAR(200) NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_asap" BOOLEAN NOT NULL DEFAULT true,
    "preferred_start_at" TIMESTAMPTZ(6),
    "preferred_end_at" TIMESTAMPTZ(6),
    "budget_min_kobo" INTEGER,
    "budget_max_kobo" INTEGER,
    "urgency" "RequestUrgency" NOT NULL DEFAULT 'STANDARD',
    "status" "JobRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "client_idempotency_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_request_media" (
    "id" VARCHAR(26) NOT NULL,
    "request_id" VARCHAR(26) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "job_request_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" VARCHAR(26) NOT NULL,
    "job_request_id" VARCHAR(26) NOT NULL,
    "technician_profile_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "active_slot" VARCHAR(10) DEFAULT 'ACTIVE',
    "price_kobo" INTEGER NOT NULL,
    "labor_kobo" INTEGER,
    "materials_kobo" INTEGER,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'NGN',
    "message" VARCHAR(1200),
    "estimated_start_at" TIMESTAMPTZ(6),
    "estimated_arrival_mins" INTEGER,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "client_idempotency_key" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_revisions" (
    "id" VARCHAR(26) NOT NULL,
    "quote_id" VARCHAR(26) NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" VARCHAR(26) NOT NULL,
    "job_request_id" VARCHAR(26) NOT NULL,
    "quote_id" VARCHAR(26) NOT NULL,
    "customer_id" UUID NOT NULL,
    "technician_profile_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "payment_method" "BookingPaymentMethod" NOT NULL,
    "price_kobo" INTEGER NOT NULL,
    "platform_fee_preview_kobo" INTEGER NOT NULL DEFAULT 0,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'NGN',
    "commission_rule_snapshot" JSONB,
    "accept_idempotency_key" VARCHAR(100) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_history" (
    "id" VARCHAR(26) NOT NULL,
    "booking_id" VARCHAR(26) NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "actor_user_id" UUID,
    "actor_role" "BookingActorRole" NOT NULL,
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellations" (
    "id" VARCHAR(26) NOT NULL,
    "booking_id" VARCHAR(26) NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "reason_code" VARCHAR(60) NOT NULL,
    "reason" VARCHAR(1000),
    "client_idempotency_key" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_availability_blocks" (
    "id" VARCHAR(26) NOT NULL,
    "technician_profile_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" VARCHAR(240),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" VARCHAR(26) NOT NULL,
    "job_request_id" VARCHAR(26) NOT NULL,
    "booking_id" VARCHAR(26),
    "technician_profile_id" UUID NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" VARCHAR(26) NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ConversationParticipantRole" NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMPTZ(6),

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" VARCHAR(26) NOT NULL,
    "conversation_id" VARCHAR(26) NOT NULL,
    "sender_id" UUID NOT NULL,
    "client_message_key" VARCHAR(100) NOT NULL,
    "body" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edited_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" VARCHAR(26) NOT NULL,
    "message_id" VARCHAR(26) NOT NULL,
    "object_key" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(80) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_flags" (
    "id" VARCHAR(26) NOT NULL,
    "message_id" VARCHAR(26) NOT NULL,
    "flag_types" TEXT[],
    "status" "MessageFlagStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id" UUID,
    "review_note" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "message_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_requests_area_id_service_id_status_created_at_idx" ON "job_requests"("area_id", "service_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_requests_service_id_status_created_at_idx" ON "job_requests"("service_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_requests_customer_id_created_at_idx" ON "job_requests"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_requests_direct_technician_profile_id_status_created_at_idx" ON "job_requests"("direct_technician_profile_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_requests_status_expires_at_idx" ON "job_requests"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_requests_customer_id_client_idempotency_key_key" ON "job_requests"("customer_id", "client_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "job_request_media_object_key_key" ON "job_request_media"("object_key");

-- CreateIndex
CREATE INDEX "job_request_media_request_id_created_at_idx" ON "job_request_media"("request_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_request_media_request_id_sort_order_key" ON "job_request_media"("request_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_client_idempotency_key_key" ON "quotes"("client_idempotency_key");

-- CreateIndex
CREATE INDEX "quotes_job_request_id_status_created_at_idx" ON "quotes"("job_request_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "quotes_technician_profile_id_status_created_at_idx" ON "quotes"("technician_profile_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "quotes_status_valid_until_idx" ON "quotes"("status", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_job_request_id_technician_profile_id_active_slot_key" ON "quotes"("job_request_id", "technician_profile_id", "active_slot");

-- CreateIndex
CREATE INDEX "quote_revisions_quote_id_created_at_idx" ON "quote_revisions"("quote_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quote_revisions_quote_id_version_key" ON "quote_revisions"("quote_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_job_request_id_key" ON "bookings"("job_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_quote_id_key" ON "bookings"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_accept_idempotency_key_key" ON "bookings"("accept_idempotency_key");

-- CreateIndex
CREATE INDEX "bookings_customer_id_status_created_at_idx" ON "bookings"("customer_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_technician_profile_id_status_accepted_at_idx" ON "bookings"("technician_profile_id", "status", "accepted_at" DESC);

-- CreateIndex
CREATE INDEX "bookings_status_created_at_idx" ON "bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "booking_status_history_booking_id_created_at_idx" ON "booking_status_history"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "booking_status_history_to_status_created_at_idx" ON "booking_status_history"("to_status", "created_at");

-- CreateIndex
CREATE INDEX "booking_status_history_actor_user_id_created_at_idx" ON "booking_status_history"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cancellations_booking_id_key" ON "cancellations"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "cancellations_client_idempotency_key_key" ON "cancellations"("client_idempotency_key");

-- CreateIndex
CREATE INDEX "cancellations_actor_user_id_created_at_idx" ON "cancellations"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "technician_availability_blocks_technician_profile_id_starts_idx" ON "technician_availability_blocks"("technician_profile_id", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_booking_id_key" ON "conversations"("booking_id");

-- CreateIndex
CREATE INDEX "conversations_technician_profile_id_updated_at_idx" ON "conversations"("technician_profile_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_job_request_id_technician_profile_id_key" ON "conversations"("job_request_id", "technician_profile_id");

-- CreateIndex
CREATE INDEX "conversation_participants_user_id_last_read_at_idx" ON "conversation_participants"("user_id", "last_read_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_id_idx" ON "messages"("conversation_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "messages_conversation_id_sender_id_client_message_key_key" ON "messages"("conversation_id", "sender_id", "client_message_key");

-- CreateIndex
CREATE UNIQUE INDEX "message_attachments_object_key_key" ON "message_attachments"("object_key");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_created_at_idx" ON "message_attachments"("message_id", "created_at");

-- CreateIndex
CREATE INDEX "message_flags_status_created_at_idx" ON "message_flags"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "message_flags_reviewed_by_id_reviewed_at_idx" ON "message_flags"("reviewed_by_id", "reviewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_flags_message_id_key" ON "message_flags"("message_id");

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_direct_technician_profile_id_fkey" FOREIGN KEY ("direct_technician_profile_id") REFERENCES "technician_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_request_media" ADD CONSTRAINT "job_request_media_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_technician_profile_id_fkey" FOREIGN KEY ("technician_profile_id") REFERENCES "technician_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_technician_profile_id_fkey" FOREIGN KEY ("technician_profile_id") REFERENCES "technician_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_availability_blocks" ADD CONSTRAINT "technician_availability_blocks_technician_profile_id_fkey" FOREIGN KEY ("technician_profile_id") REFERENCES "technician_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_technician_profile_id_fkey" FOREIGN KEY ("technician_profile_id") REFERENCES "technician_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application-generated ULID primary keys are fixed-width Crockford base32.
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "job_request_media" ADD CONSTRAINT "job_request_media_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "quote_revisions" ADD CONSTRAINT "quote_revisions_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "booking_status_history" ADD CONSTRAINT "booking_status_history_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "technician_availability_blocks" ADD CONSTRAINT "technician_availability_blocks_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "messages" ADD CONSTRAINT "messages_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_ulid_check" CHECK (length("id") = 26);
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_ulid_check" CHECK (length("id") = 26);

ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_geo_pair_check" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_geo_range_check" CHECK (("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90) AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180));
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_time_window_check" CHECK ("is_asap" OR ("preferred_start_at" IS NOT NULL AND "preferred_end_at" IS NOT NULL AND "preferred_end_at" > "preferred_start_at"));
ALTER TABLE "job_requests" ADD CONSTRAINT "job_requests_budget_check" CHECK (("budget_min_kobo" IS NULL OR "budget_min_kobo" >= 0) AND ("budget_max_kobo" IS NULL OR "budget_max_kobo" >= 0) AND ("budget_min_kobo" IS NULL OR "budget_max_kobo" IS NULL OR "budget_min_kobo" <= "budget_max_kobo"));
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_amounts_check" CHECK ("price_kobo" >= 0 AND ("labor_kobo" IS NULL OR "labor_kobo" >= 0) AND ("materials_kobo" IS NULL OR "materials_kobo" >= 0) AND ("labor_kobo" IS NULL OR "labor_kobo" <= "price_kobo") AND ("materials_kobo" IS NULL OR "materials_kobo" <= "price_kobo"));
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_active_slot_check" CHECK (("status" = 'ACTIVE' AND "active_slot" = 'ACTIVE') OR ("status" <> 'ACTIVE' AND "active_slot" IS NULL));
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_version_check" CHECK ("version" > 0 AND "valid_until" > "created_at");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_amounts_check" CHECK ("price_kobo" > 0 AND "platform_fee_preview_kobo" >= 0 AND "currency_code" = 'NGN');
ALTER TABLE "technician_availability_blocks" ADD CONSTRAINT "technician_availability_blocks_window_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "job_request_media" ADD CONSTRAINT "job_request_media_size_check" CHECK ("size_bytes" BETWEEN 1 AND 8000000);
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_size_check" CHECK ("size_bytes" BETWEEN 1 AND 8000000);
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_types_check" CHECK (COALESCE(array_length("flag_types", 1), 0) > 0);
ALTER TABLE "messages" ADD CONSTRAINT "messages_body_length_check" CHECK (length("body") <= 4000);
