/**
 * Google Calendar Routes
 * Track 4: Bidirectional sync endpoints
 */

import { Router, Request, Response } from 'express';
import { createCalendarService, CalendarEvent } from '../services/calendar';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';

const router = Router();
const calendarService = createCalendarService();

/**
 * @swagger
 * /api/calendar/oauth2callback:
 *   get:
 *     summary: OAuth2 callback endpoint
 *     description: Exchanges Google authorization code for access tokens
 *     tags: [Calendar]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google OAuth
 *     responses:
 *       200:
 *         description: Authorization successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *                     expiry_date:
 *                       type: number
 *       400:
 *         description: Missing authorization code
 *       500:
 *         description: Authorization failed
 */
router.get('/oauth2callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const tokens = await calendarService.getTokensFromCode(code);

    // TODO: Store tokens securely (database or encrypted storage)
    // For now, return them to the client
    return res.json({
      message: 'Authorization successful',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
    });
  } catch (error: any) {
    console.error('OAuth2 callback error:', error);
    return res.status(500).json({ error: 'Failed to authorize with Google Calendar' });
  }
});

/**
 * Get authorization URL
 * Returns URL for user to authorize calendar access
 */
router.get('/auth-url', authenticateToken, (_req: Request, res: Response) => {
  try {
    const authUrl = calendarService.getAuthUrl();
    return res.json({ authUrl });
  } catch (error: any) {
    console.error('Failed to generate auth URL:', error);
    return res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * Sync reservation to Google Calendar (Push)
 * Creates or updates calendar event from reservation
 */
router.post('/sync-to-calendar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reservationId, accessToken } = req.body;

    if (!reservationId || !accessToken) {
      return res.status(400).json({
        error: 'Missing required fields: reservationId, accessToken',
      });
    }

    // Set credentials
    calendarService.setCredentials({ access_token: accessToken });

    // Fetch reservation from database
    const result = await db.query(
      'SELECT * FROM reservations WHERE id = $1',
      [reservationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = result.rows[0];

    // Check if calendar event already exists
    const existingSync = await db.query(
      'SELECT calendar_event_id FROM calendar_sync_log WHERE reservation_id = $1 AND sync_status = $2 ORDER BY synced_at DESC LIMIT 1',
      [reservationId, 'SUCCESS']
    );

    const event: CalendarEvent = {
      reservationId: reservation.id,
      title: `Studio Reservation - ${reservation.customer_name || 'Customer'}`,
      startTime: new Date(reservation.start_time),
      endTime: new Date(reservation.end_time),
      description: `Reservation ID: ${reservation.id}\nCustomer: ${reservation.customer_name || 'N/A'}\nHeadcount: ${reservation.initial_headcount}\nTotal: ${reservation.total_price}원`,
      location: 'Studio',
      attendees: reservation.customer_email ? [reservation.customer_email] : [],
    };

    let syncResult;

    if (existingSync.rows.length > 0) {
      // Update existing event
      const eventId = existingSync.rows[0].calendar_event_id;
      syncResult = await calendarService.updateEvent(eventId, event);
    } else {
      // Create new event
      syncResult = await calendarService.createEvent(event);
    }

    // Log sync operation
    await db.query(
      'INSERT INTO calendar_sync_log (reservation_id, calendar_event_id, sync_direction, sync_status, error_message) VALUES ($1, $2, $3, $4, $5)',
      [
        reservationId,
        syncResult.eventId || 'UNKNOWN',
        'TO_CALENDAR',
        syncResult.success ? 'SUCCESS' : 'FAILED',
        syncResult.error || null,
      ]
    );

    return res.json({
      success: syncResult.success,
      eventId: syncResult.eventId,
      operation: syncResult.operation,
      error: syncResult.error,
    });
  } catch (error: any) {
    console.error('Sync to calendar error:', error);
    return res.status(500).json({ error: 'Failed to sync reservation to calendar' });
  }
});

/**
 * Sync from Google Calendar (Pull)
 * Updates or creates reservations from calendar events
 */
router.post('/sync-from-calendar', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, accessToken } = req.body;

    if (!startDate || !endDate || !accessToken) {
      return res.status(400).json({
        error: 'Missing required fields: startDate, endDate, accessToken',
      });
    }

    // Set credentials
    calendarService.setCredentials({ access_token: accessToken });

    // Fetch events from calendar
    const events = await calendarService.listEvents(
      new Date(startDate),
      new Date(endDate)
    );

    const syncResults = [];

    for (const event of events) {
      try {
        // Extract reservation ID from extended properties if exists
        const reservationId = event.extendedProperties?.private?.reservationId;

        if (!reservationId) {
          // Skip events not created by our system
          continue;
        }

        // Check if reservation exists
        const result = await db.query(
          'SELECT * FROM reservations WHERE id = $1',
          [parseInt(reservationId, 10)]
        );

        if (result.rows.length === 0) {
          syncResults.push({
            eventId: event.id,
            reservationId: parseInt(reservationId, 10),
            success: false,
            error: 'Reservation not found in database',
          });
          continue;
        }

        // Update reservation with calendar event data
        await db.query(
          'UPDATE reservations SET start_time = $1, end_time = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [
            event.start?.dateTime || event.start?.date,
            event.end?.dateTime || event.end?.date,
            parseInt(reservationId, 10),
          ]
        );

        // Log sync operation
        await db.query(
          'INSERT INTO calendar_sync_log (reservation_id, calendar_event_id, sync_direction, sync_status) VALUES ($1, $2, $3, $4)',
          [parseInt(reservationId, 10), event.id, 'FROM_CALENDAR', 'SUCCESS']
        );

        syncResults.push({
          eventId: event.id,
          reservationId: parseInt(reservationId, 10),
          success: true,
        });
      } catch (error: any) {
        console.error('Error syncing event:', error);
        syncResults.push({
          eventId: event.id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    return res.json({
      totalEvents: events.length,
      synced: syncResults.filter((r) => r.success).length,
      failed: syncResults.filter((r) => !r.success).length,
      results: syncResults,
    });
  } catch (error: any) {
    console.error('Sync from calendar error:', error);
    return res.status(500).json({ error: 'Failed to sync from calendar' });
  }
});

/**
 * Delete calendar event
 * Removes event from Google Calendar
 */
router.delete('/event/:eventId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing access token' });
    }

    // Set credentials
    calendarService.setCredentials({ access_token: accessToken });

    const result = await calendarService.deleteEvent(eventId);

    if (result.success) {
      // Update sync log
      await db.query(
        'UPDATE calendar_sync_log SET sync_status = $1 WHERE calendar_event_id = $2',
        ['DELETED', eventId]
      );
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Delete calendar event error:', error);
    return res.status(500).json({ error: 'Failed to delete calendar event' });
  }
});

/**
 * Get sync history for a reservation
 */
router.get('/sync-history/:reservationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { reservationId } = req.params;

    const result = await db.query(
      'SELECT * FROM calendar_sync_log WHERE reservation_id = $1 ORDER BY synced_at DESC',
      [parseInt(reservationId, 10)]
    );

    return res.json({
      reservationId: parseInt(reservationId, 10),
      syncHistory: result.rows,
    });
  } catch (error: any) {
    console.error('Get sync history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve sync history' });
  }
});

export default router;
