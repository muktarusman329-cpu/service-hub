ALTER TABLE bookings ADD COLUMN completed_by_technician_at TIMESTAMPTZ(6);
ALTER TABLE booking_status_history ADD COLUMN client_action_key VARCHAR(100);
CREATE UNIQUE INDEX booking_status_history_booking_id_client_action_key_key ON booking_status_history(booking_id, client_action_key);
ALTER TABLE cancellations ADD COLUMN is_late BOOLEAN NOT NULL DEFAULT false;