-- Migration: 004_add_calendar_sync.sql
-- Description: Add calendar sync tracking table
-- Track 4: Google Calendar Integration

-- Calendar Sync Log Table
-- Tracks synchronization between reservations and Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  calendar_event_id VARCHAR(255) NOT NULL,
  sync_direction VARCHAR(20) NOT NULL CHECK (sync_direction IN ('TO_CALENDAR', 'FROM_CALENDAR')),
  sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN ('SUCCESS', 'FAILED', 'PENDING')),
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique mapping between reservation and calendar event
  CONSTRAINT unique_reservation_event UNIQUE (reservation_id, calendar_event_id)
);

-- Indexes for performance
CREATE INDEX idx_calendar_sync_reservation ON calendar_sync_log(reservation_id);
CREATE INDEX idx_calendar_sync_event ON calendar_sync_log(calendar_event_id);
CREATE INDEX idx_calendar_sync_status ON calendar_sync_log(sync_status);
CREATE INDEX idx_calendar_sync_synced_at ON calendar_sync_log(synced_at DESC);

-- Updated_at trigger for calendar_sync_log
CREATE TRIGGER update_calendar_sync_log_updated_at
  BEFORE UPDATE ON calendar_sync_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE calendar_sync_log IS 'Tracks synchronization between studio reservations and Google Calendar events';
COMMENT ON COLUMN calendar_sync_log.reservation_id IS 'Reference to the reservation being synced';
COMMENT ON COLUMN calendar_sync_log.calendar_event_id IS 'Google Calendar event ID';
COMMENT ON COLUMN calendar_sync_log.sync_direction IS 'Direction of sync: TO_CALENDAR (push) or FROM_CALENDAR (pull)';
COMMENT ON COLUMN calendar_sync_log.sync_status IS 'Status of the sync operation';
COMMENT ON COLUMN calendar_sync_log.error_message IS 'Error message if sync failed';
COMMENT ON COLUMN calendar_sync_log.synced_at IS 'Timestamp when sync occurred';
