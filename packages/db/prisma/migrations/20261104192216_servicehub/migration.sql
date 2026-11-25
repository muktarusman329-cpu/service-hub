-- DropIndex
DROP INDEX "booking_status_history_booking_id_client_action_key_key";

-- RenameIndex
ALTER INDEX "bookings_technician_profile_id_scheduled_start_at_scheduled_end" RENAME TO "bookings_technician_profile_id_scheduled_start_at_scheduled_idx";
