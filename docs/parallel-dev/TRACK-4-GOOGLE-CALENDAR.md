# Track 4: Google Calendar Integration

**Developer**: Developer D
**Duration**: 3-4 days
**Priority**: ⚠️ Important but Not Urgent
**Value**: Automation of manual scheduling

## Objective

Implement bidirectional synchronization between Google Calendar and the Studio Revenue Manager reservation system, enabling automatic booking creation and real-time calendar updates.

## Business Value

- **Time Savings**: Eliminate manual dual-entry (calendar + system)
- **Error Reduction**: Single source of truth for reservations
- **Real-Time Updates**: Instant calendar reflection of booking changes
- **Customer Experience**: Calendar invites sent automatically
- **Staff Efficiency**: Manage bookings from familiar Google Calendar UI

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ Google Calendar │ ←─sync─→│ Calendar Service │ ←─sync─→│ Reservations DB │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                             │
        │ Webhook Events             │ Parse/Transform             │ Insert/Update
        │                            │                             │
        └────────────────────────────┴─────────────────────────────┘
                        Real-time Bidirectional Sync
```

## Implementation Plan

### Step 1: Google Cloud Project Setup (1 hour)

**Prerequisites**: Google Cloud account with billing enabled

#### 1.1 Create Service Account

1. Navigate to https://console.cloud.google.com/
2. Create new project: "Studio Revenue Manager"
3. Enable APIs:
   - Google Calendar API
   - Google Calendar Events API
4. Create Service Account:
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: "studio-calendar-sync"
   - Role: "Calendar Editor"
   - Create and download JSON key

#### 1.2 Share Calendar with Service Account

1. Open Google Calendar (calendar.google.com)
2. Find "Studio Practice Rooms" calendar (or create new)
3. Settings → Share with specific people
4. Add service account email (e.g., `studio-calendar-sync@PROJECT_ID.iam.gserviceaccount.com`)
5. Permission: "Make changes to events"

#### 1.3 Store Credentials Securely

**Create**: `packages/backend/src/config/google-credentials.json`

```json
{
  "type": "service_account",
  "project_id": "studio-revenue-manager",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "studio-calendar-sync@PROJECT_ID.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
```

**Update `.gitignore`**:
```
# Google credentials
packages/backend/src/config/google-credentials.json
```

**Create template**: `packages/backend/src/config/google-credentials.example.json`

```json
{
  "type": "service_account",
  "project_id": "YOUR_PROJECT_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "YOUR_SERVICE_ACCOUNT_EMAIL"
}
```

### Step 2: Install Dependencies (15 min)

```bash
cd packages/backend
npm install googleapis@^126.0.0
npm install --save-dev @types/google.calendar
```

**Verify installation**:
```bash
npm list googleapis
```

### Step 3: Create Calendar Service (3 hours)

**Create**: `packages/backend/src/services/calendar.ts`

```typescript
import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';
import path from 'path';
import fs from 'fs';

// Load service account credentials
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-credentials.json');
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Scopes required for calendar access
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Initialize Google Calendar API client
let calendarClient: calendar_v3.Calendar | null = null;

/**
 * Initialize Google Calendar API with service account
 */
export function initializeCalendarClient(): calendar_v3.Calendar {
  if (calendarClient) {
    return calendarClient;
  }

  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));

    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    });

    calendarClient = google.calendar({ version: 'v3', auth });

    console.log('Google Calendar API initialized successfully');
    return calendarClient;
  } catch (error) {
    console.error('Failed to initialize Google Calendar API:', error);
    throw new Error('Calendar service unavailable');
  }
}

/**
 * Parse calendar event notes to extract metadata
 * Expected format:
 *   Room: Practice Room A
 *   Customer: 홍길동
 *   Phone: 010-1234-5678
 *   Payment: Paid
 */
export function parseEventNotes(notes: string): {
  room?: string;
  customer?: string;
  phone?: string;
  paymentStatus?: string;
} {
  const metadata: any = {};

  const lines = notes.split('\n');
  for (const line of lines) {
    const [key, value] = line.split(':').map(s => s.trim());
    if (!key || !value) continue;

    const keyLower = key.toLowerCase();
    if (keyLower === 'room') metadata.room = value;
    else if (keyLower === 'customer') metadata.customer = value;
    else if (keyLower === 'phone') metadata.phone = value;
    else if (keyLower === 'payment') metadata.paymentStatus = value;
  }

  return metadata;
}

/**
 * Format reservation metadata as calendar event notes
 */
export function formatEventNotes(metadata: {
  room: string;
  customer: string;
  phone?: string;
  paymentStatus: string;
}): string {
  return [
    `Room: ${metadata.room}`,
    `Customer: ${metadata.customer}`,
    metadata.phone ? `Phone: ${metadata.phone}` : null,
    `Payment: ${metadata.paymentStatus}`,
  ].filter(Boolean).join('\n');
}

/**
 * Create Google Calendar event from reservation
 */
export async function createCalendarEvent(reservation: {
  id: string;
  startTime: Date;
  endTime: Date;
  roomType: string;
  customerName: string;
  customerPhone?: string;
  paymentStatus: string;
}): Promise<calendar_v3.Schema$Event> {
  const calendar = initializeCalendarClient();

  const event: calendar_v3.Schema$Event = {
    summary: `[${reservation.roomType}] ${reservation.customerName}`,
    description: formatEventNotes({
      room: reservation.roomType,
      customer: reservation.customerName,
      phone: reservation.customerPhone,
      paymentStatus: reservation.paymentStatus,
    }),
    start: {
      dateTime: reservation.startTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: reservation.endTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    colorId: reservation.paymentStatus === 'Paid' ? '10' : '11', // Green for paid, Red for unpaid
    extendedProperties: {
      private: {
        reservationId: reservation.id,
        syncSource: 'studio-revenue-manager',
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: event,
    });

    console.log(`Calendar event created: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw new Error('Calendar sync failed');
  }
}

/**
 * Update Google Calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<{
    startTime: Date;
    endTime: Date;
    customerName: string;
    paymentStatus: string;
  }>
): Promise<calendar_v3.Schema$Event> {
  const calendar = initializeCalendarClient();

  try {
    // Fetch existing event
    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    const event = existing.data;

    // Apply updates
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: 'Asia/Seoul',
      };
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: 'Asia/Seoul',
      };
    }
    if (updates.customerName) {
      event.summary = event.summary?.replace(/\] .+$/, `] ${updates.customerName}`);
    }
    if (updates.paymentStatus) {
      event.colorId = updates.paymentStatus === 'Paid' ? '10' : '11';
    }

    // Update event
    const response = await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
    });

    console.log(`Calendar event updated: ${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    throw new Error('Calendar update failed');
  }
}

/**
 * Delete Google Calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = initializeCalendarClient();

  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    console.log(`Calendar event deleted: ${eventId}`);
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    throw new Error('Calendar deletion failed');
  }
}

/**
 * Fetch calendar events within date range
 */
export async function fetchCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = initializeCalendarClient();

  try {
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    throw new Error('Calendar fetch failed');
  }
}

/**
 * Sync calendar event to database reservation
 * Called when calendar event is created/updated externally
 */
export async function syncEventToDatabase(
  event: calendar_v3.Schema$Event,
  pool: any
): Promise<void> {
  // Check if already synced
  const reservationId = event.extendedProperties?.private?.reservationId;
  if (reservationId) {
    console.log(`Event already synced: ${event.id} → ${reservationId}`);
    return;
  }

  // Parse event data
  const metadata = parseEventNotes(event.description || '');
  const startTime = new Date(event.start?.dateTime || event.start?.date || '');
  const endTime = new Date(event.end?.dateTime || event.end?.date || '');

  // Extract customer name from summary
  const customerMatch = event.summary?.match(/\] (.+)$/);
  const customerName = customerMatch?.[1] || metadata.customer || 'Unknown';

  try {
    // Insert reservation into database
    const result = await pool.query(
      `INSERT INTO reservations (
        start_time,
        end_time,
        room_type,
        customer_name,
        customer_phone,
        payment_status,
        calendar_event_id,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [
        startTime,
        endTime,
        metadata.room || 'practice',
        customerName,
        metadata.phone,
        metadata.paymentStatus || 'Pending',
        event.id,
      ]
    );

    const newReservationId = result.rows[0].id;

    // Update calendar event with reservation ID
    await updateCalendarEventMetadata(event.id!, {
      reservationId: newReservationId,
    });

    console.log(`Synced calendar event ${event.id} → reservation ${newReservationId}`);
  } catch (error) {
    console.error('Failed to sync event to database:', error);
    throw error;
  }
}

/**
 * Update calendar event extended properties (metadata)
 */
async function updateCalendarEventMetadata(
  eventId: string,
  metadata: Record<string, string>
): Promise<void> {
  const calendar = initializeCalendarClient();

  try {
    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });

    const event = existing.data;
    event.extendedProperties = event.extendedProperties || {};
    event.extendedProperties.private = {
      ...event.extendedProperties.private,
      ...metadata,
    };

    await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId: eventId,
      requestBody: event,
    });
  } catch (error) {
    console.error('Failed to update event metadata:', error);
    throw error;
  }
}
```

### Step 4: Create Database Schema Updates (1 hour)

**Create**: `packages/backend/src/db/migrations/004_add_calendar_sync.sql`

```sql
-- Add calendar integration fields to reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS calendar_event_id VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Index for calendar event lookups
CREATE INDEX IF NOT EXISTS idx_reservations_calendar_event
  ON reservations(calendar_event_id);

-- Calendar sync log table
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'sync_error'
  event_id VARCHAR(255),
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  direction VARCHAR(20) NOT NULL, -- 'calendar_to_db', 'db_to_calendar'
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sync log queries
CREATE INDEX idx_sync_log_created ON calendar_sync_log(created_at DESC);
CREATE INDEX idx_sync_log_event_type ON calendar_sync_log(event_type);
CREATE INDEX idx_sync_log_success ON calendar_sync_log(success);
```

Run migration:
```bash
cd packages/backend
npm run db:migrate
```

### Step 5: Create Calendar Routes (2 hours)

**Create**: `packages/backend/src/routes/calendar.ts`

```typescript
import { Router, Request, Response } from 'express';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  syncEventToDatabase,
} from '../services/calendar';
import { authenticateToken } from '../middleware/auth';
import pool from '../db';

const router = Router();

// POST /api/calendar/sync-to-calendar/:reservationId
router.post('/sync-to-calendar/:reservationId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { reservationId } = req.params;

    // Fetch reservation from database
    const result = await pool.query(
      `SELECT * FROM reservations WHERE id = $1`,
      [reservationId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    const reservation = result.rows[0];

    // Check if already synced
    if (reservation.calendar_event_id) {
      res.status(409).json({
        error: 'Already synced to calendar',
        calendarEventId: reservation.calendar_event_id,
      });
      return;
    }

    // Create calendar event
    const event = await createCalendarEvent({
      id: reservation.id,
      startTime: new Date(reservation.start_time),
      endTime: new Date(reservation.end_time),
      roomType: reservation.room_type,
      customerName: reservation.customer_name,
      customerPhone: reservation.customer_phone,
      paymentStatus: reservation.payment_status,
    });

    // Update reservation with calendar event ID
    await pool.query(
      `UPDATE reservations
       SET calendar_event_id = $1, last_synced_at = NOW()
       WHERE id = $2`,
      [event.id, reservationId]
    );

    // Log sync
    await pool.query(
      `INSERT INTO calendar_sync_log (event_type, event_id, reservation_id, direction, success)
       VALUES ($1, $2, $3, $4, $5)`,
      ['create', event.id, reservationId, 'db_to_calendar', true]
    );

    res.json({
      success: true,
      calendarEventId: event.id,
      calendarLink: event.htmlLink,
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Calendar sync failed' });
  }
});

// POST /api/calendar/sync-from-calendar
router.post('/sync-from-calendar', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.body;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Fetch calendar events
    const events = await fetchCalendarEvents(start, end);

    let syncedCount = 0;
    const errors: any[] = [];

    for (const event of events) {
      try {
        await syncEventToDatabase(event, pool);
        syncedCount++;
      } catch (error) {
        errors.push({
          eventId: event.id,
          summary: event.summary,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      totalEvents: events.length,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Calendar sync failed' });
  }
});

// GET /api/calendar/sync-log
router.get('/sync-log', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM calendar_sync_log
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      logs: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Failed to fetch sync log:', error);
    res.status(500).json({ error: 'Failed to fetch sync log' });
  }
});

export default router;
```

**Register routes** in `packages/backend/src/app.ts`:

```typescript
import calendarRoutes from './routes/calendar';
app.use('/api/calendar', calendarRoutes);
```

### Step 6: Add Reservation Hooks (1 hour)

**Modify**: `packages/backend/src/routes/reservation.ts`

Add automatic calendar sync on reservation changes:

```typescript
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/calendar';

// After creating reservation
router.post('/reservations', authenticateToken, async (req, res) => {
  // ... existing reservation creation code ...

  try {
    // Auto-sync to calendar
    const calendarEvent = await createCalendarEvent({
      id: newReservation.id,
      startTime: newReservation.start_time,
      endTime: newReservation.end_time,
      roomType: newReservation.room_type,
      customerName: newReservation.customer_name,
      customerPhone: newReservation.customer_phone,
      paymentStatus: newReservation.payment_status,
    });

    // Update reservation with calendar event ID
    await pool.query(
      `UPDATE reservations SET calendar_event_id = $1 WHERE id = $2`,
      [calendarEvent.id, newReservation.id]
    );

    res.status(201).json({
      ...newReservation,
      calendarEventId: calendarEvent.id,
    });
  } catch (error) {
    // Calendar sync failed, but reservation created
    console.error('Calendar auto-sync failed:', error);
    res.status(201).json({
      ...newReservation,
      calendarSyncFailed: true,
    });
  }
});

// After updating reservation
router.put('/reservations/:id', authenticateToken, async (req, res) => {
  // ... existing update code ...

  if (updatedReservation.calendar_event_id) {
    try {
      await updateCalendarEvent(updatedReservation.calendar_event_id, {
        startTime: updatedReservation.start_time,
        endTime: updatedReservation.end_time,
        paymentStatus: updatedReservation.payment_status,
      });
    } catch (error) {
      console.error('Calendar update failed:', error);
    }
  }

  res.json(updatedReservation);
});

// Before deleting reservation
router.delete('/reservations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  // Fetch calendar event ID
  const result = await pool.query(
    'SELECT calendar_event_id FROM reservations WHERE id = $1',
    [id]
  );

  const calendarEventId = result.rows[0]?.calendar_event_id;

  // Delete from database
  await pool.query('DELETE FROM reservations WHERE id = $1', [id]);

  // Delete from calendar
  if (calendarEventId) {
    try {
      await deleteCalendarEvent(calendarEventId);
    } catch (error) {
      console.error('Calendar deletion failed:', error);
    }
  }

  res.status(204).send();
});
```

### Step 7: Add Environment Configuration (15 min)

**Update**: `packages/backend/.env.example`

```bash
# Google Calendar Integration
GOOGLE_CALENDAR_ID=primary
GOOGLE_CREDENTIALS_PATH=./src/config/google-credentials.json
CALENDAR_AUTO_SYNC=true
```

### Step 8: Integration Tests (3 hours)

**Create**: `packages/backend/src/services/__tests__/calendar.test.ts`

```typescript
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEvents,
  parseEventNotes,
  formatEventNotes,
} from '../calendar';

describe('Google Calendar Service', () => {
  describe('parseEventNotes', () => {
    it('should parse event notes correctly', () => {
      const notes = `Room: Practice Room A
Customer: 홍길동
Phone: 010-1234-5678
Payment: Paid`;

      const parsed = parseEventNotes(notes);

      expect(parsed.room).toBe('Practice Room A');
      expect(parsed.customer).toBe('홍길동');
      expect(parsed.phone).toBe('010-1234-5678');
      expect(parsed.paymentStatus).toBe('Paid');
    });
  });

  describe('formatEventNotes', () => {
    it('should format event notes correctly', () => {
      const notes = formatEventNotes({
        room: 'Practice Room A',
        customer: '홍길동',
        phone: '010-1234-5678',
        paymentStatus: 'Paid',
      });

      expect(notes).toContain('Room: Practice Room A');
      expect(notes).toContain('Customer: 홍길동');
      expect(notes).toContain('Phone: 010-1234-5678');
      expect(notes).toContain('Payment: Paid');
    });
  });

  describe('Calendar API Integration', () => {
    let testEventId: string;

    it('should create calendar event', async () => {
      const event = await createCalendarEvent({
        id: 'test-reservation-123',
        startTime: new Date('2025-10-15T10:00:00+09:00'),
        endTime: new Date('2025-10-15T12:00:00+09:00'),
        roomType: 'Practice Room A',
        customerName: 'Test Customer',
        paymentStatus: 'Paid',
      });

      expect(event.id).toBeDefined();
      expect(event.summary).toContain('Test Customer');

      testEventId = event.id!;
    });

    it('should update calendar event', async () => {
      const updated = await updateCalendarEvent(testEventId, {
        paymentStatus: 'Pending',
      });

      expect(updated.colorId).toBe('11'); // Red for unpaid
    });

    it('should fetch calendar events', async () => {
      const events = await fetchCalendarEvents(
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.id === testEventId)).toBe(true);
    });

    it('should delete calendar event', async () => {
      await deleteCalendarEvent(testEventId);

      const events = await fetchCalendarEvents(
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );

      expect(events.some(e => e.id === testEventId)).toBe(false);
    });
  });
});
```

Run tests:
```bash
cd packages/backend
npm test -- calendar.test.ts
```

## Testing Checklist

- [ ] Service account authentication works
- [ ] Calendar event creation successful
- [ ] Calendar event update successful
- [ ] Calendar event deletion successful
- [ ] Bidirectional sync works (Calendar ↔ DB)
- [ ] Event notes parsing extracts metadata
- [ ] Reservation hooks trigger calendar sync
- [ ] Conflict resolution handles duplicate events
- [ ] Error handling for API failures
- [ ] Integration tests passing

## Success Criteria

1. ✅ Service account configured and authenticated
2. ✅ Calendar events created automatically on reservation
3. ✅ Calendar events updated on reservation changes
4. ✅ Calendar events deleted on reservation cancellation
5. ✅ Manual sync endpoint fetches external calendar events
6. ✅ Event metadata parsed correctly (room, customer, payment)
7. ✅ Sync log tracks all calendar operations
8. ✅ Error handling for API failures and rate limits
9. ✅ Integration tests passing (≥80% coverage)

## Coordination Notes

### Dependencies on Other Tracks
- **Track 1 (Auth)**: Uses authenticateToken middleware for calendar endpoints
- **Track 2 (DB Pooling)**: Benefits from connection retry logic

### Shared Files
- `packages/backend/src/app.ts` - Adding `/api/calendar` routes
- `packages/backend/src/routes/reservation.ts` - Adding calendar sync hooks

### Integration Timeline
1. **Day 1-2**: Google Cloud setup, service implementation
2. **Day 3**: Routes, database schema, reservation hooks
3. **Day 4**: Testing, error handling, documentation

## Performance Considerations

### Rate Limits
- Google Calendar API: 1,000,000 queries/day
- Per-user limit: 500 queries/100 seconds
- Batch requests recommended for bulk operations

### Optimization Strategies
- Cache calendar events locally (30 min TTL)
- Batch sync operations (max 25 events/request)
- Queue calendar updates for retry on failure
- Use webhook notifications instead of polling (future enhancement)

## Resources

- Google Calendar API Documentation: https://developers.google.com/calendar/api/v3/reference
- Service Account Setup: https://cloud.google.com/iam/docs/service-accounts
- googleapis Node.js Client: https://github.com/googleapis/google-api-nodejs-client
