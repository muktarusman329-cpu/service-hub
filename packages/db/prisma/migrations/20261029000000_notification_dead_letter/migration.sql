ALTER TABLE notifications
  ADD CONSTRAINT notifications_status_valid
  CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'RETRYING', 'DEAD_LETTER'));

CREATE INDEX notifications_dead_letter_created_at_idx
  ON notifications (created_at DESC)
  WHERE status = 'DEAD_LETTER';
