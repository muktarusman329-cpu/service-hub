ALTER TABLE "bookings" ADD COLUMN "scheduled_start_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN "scheduled_end_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 hours');
ALTER TABLE "bookings" ALTER COLUMN "scheduled_start_at" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "scheduled_end_at" DROP DEFAULT;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_check" CHECK ("scheduled_end_at" > "scheduled_start_at");
CREATE INDEX "bookings_technician_profile_id_scheduled_start_at_scheduled_end_at_idx" ON "bookings"("technician_profile_id", "scheduled_start_at", "scheduled_end_at");

ALTER TABLE "cancellations" ALTER COLUMN "booking_id" DROP NOT NULL;
ALTER TABLE "cancellations" ADD COLUMN "job_request_id" VARCHAR(26);
CREATE UNIQUE INDEX "cancellations_job_request_id_key" ON "cancellations"("job_request_id");
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "job_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_target_check" CHECK (("booking_id" IS NOT NULL AND "job_request_id" IS NULL) OR ("booking_id" IS NULL AND "job_request_id" IS NOT NULL));
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_request_ulid_check" CHECK ("job_request_id" IS NULL OR length("job_request_id") = 26);
