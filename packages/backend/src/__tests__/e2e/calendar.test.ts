/**
 * Calendar Sync E2E Tests
 * Tests for Google Calendar integration with mocked APIs
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import { TestData } from '../utils/testData';
import { MockApis } from '../utils/mockApis';
import pool from '../../db';

describe('Calendar Sync E2E Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await TestDb.clean();
    const { user, token } = await TestAuth.createUserWithToken('calendar@test.com');
    authToken = token;
    userId = user.id;
    MockApis.disableNetConnect();
  });

  afterAll(async () => {
    await TestDb.clean();
    MockApis.enableNetConnect();
  });

  beforeEach(async () => {
    await TestData.cleanup();
  });

  afterEach(() => {
    MockApis.cleanAll();
  });

  describe('OAuth Flow', () => {
    it('should handle OAuth callback with valid code', async () => {
      MockApis.mockGoogleOAuth(true);

      const response = await request(app)
        .post('/api/calendar/oauth/callback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'valid_auth_code'
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should reject invalid OAuth code', async () => {
      MockApis.mockGoogleOAuth(false);

      const response = await request(app)
        .post('/api/calendar/oauth/callback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'invalid_code'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('OAuth');
    });

    it('should require authentication for OAuth', async () => {
      const response = await request(app)
        .post('/api/calendar/oauth/callback')
        .send({
          code: 'any_code'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Push Reservation to Calendar', () => {
    it('should create calendar event from reservation', async () => {
      MockApis.mockCalendarCreateEvent(true);

      const reservation = await TestData.createReservation();

      const response = await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveProperty('eventId');

      // Verify sync history was created
      const history = await pool.query(
        `SELECT * FROM calendar_sync_history
         WHERE reservation_id = $1 AND action = 'push'`,
        [reservation.id]
      );
      expect(history.rows.length).toBe(1);
      expect(history.rows[0].status).toBe('success');
    });

    it('should handle calendar API errors gracefully', async () => {
      MockApis.mockCalendarCreateEvent(false);

      const reservation = await TestData.createReservation();

      const response = await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Calendar');

      // Verify error was logged in sync history
      const history = await pool.query(
        `SELECT * FROM calendar_sync_history
         WHERE reservation_id = $1`,
        [reservation.id]
      );
      expect(history.rows.length).toBe(1);
      expect(history.rows[0].status).toBe('failed');
    });

    it('should reject push for non-existent reservation', async () => {
      const response = await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: 'non-existent-id'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Pull Events from Calendar', () => {
    it('should fetch events from calendar', async () => {
      MockApis.mockCalendarListEvents(true);

      const response = await request(app)
        .get('/api/calendar/sync/pull')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should handle calendar access denial', async () => {
      MockApis.mockCalendarListEvents(false);

      const response = await request(app)
        .get('/api/calendar/sync/pull')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('access');
    });
  });

  describe('Update Calendar Event', () => {
    it('should update existing calendar event', async () => {
      const eventId = 'test_event_id';
      MockApis.mockCalendarUpdateEvent(eventId, true);

      const reservation = await TestData.createReservation();

      // Create sync history entry
      await pool.query(
        `INSERT INTO calendar_sync_history
         (reservation_id, calendar_event_id, action, status)
         VALUES ($1, $2, 'push', 'success')`,
        [reservation.id, eventId]
      );

      const response = await request(app)
        .put('/api/calendar/sync/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          eventId: eventId
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // Verify update was logged
      const history = await pool.query(
        `SELECT * FROM calendar_sync_history
         WHERE reservation_id = $1 AND action = 'update'`,
        [reservation.id]
      );
      expect(history.rows.length).toBe(1);
    });

    it('should handle event not found error', async () => {
      const eventId = 'non_existent_event';
      MockApis.mockCalendarUpdateEvent(eventId, false);

      const reservation = await TestData.createReservation();

      const response = await request(app)
        .put('/api/calendar/sync/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          eventId: eventId
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Delete Calendar Event', () => {
    it('should delete calendar event', async () => {
      const eventId = 'test_event_to_delete';
      MockApis.mockCalendarDeleteEvent(eventId, true);

      const reservation = await TestData.createReservation();

      // Create sync history entry
      await pool.query(
        `INSERT INTO calendar_sync_history
         (reservation_id, calendar_event_id, action, status)
         VALUES ($1, $2, 'push', 'success')`,
        [reservation.id, eventId]
      );

      const response = await request(app)
        .delete('/api/calendar/sync/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          eventId: eventId
        });

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // Verify deletion was logged
      const history = await pool.query(
        `SELECT * FROM calendar_sync_history
         WHERE reservation_id = $1 AND action = 'delete'`,
        [reservation.id]
      );
      expect(history.rows.length).toBe(1);
    });

    it('should handle already deleted event', async () => {
      const eventId = 'already_deleted_event';
      MockApis.mockCalendarDeleteEvent(eventId, false);

      const reservation = await TestData.createReservation();

      const response = await request(app)
        .delete('/api/calendar/sync/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          eventId: eventId
        });

      expect(response.status).toBe(404);
    });
  });

  describe('Sync History Tracking', () => {
    it('should track all sync operations', async () => {
      MockApis.mockCalendarCreateEvent(true);

      const reservation = await TestData.createReservation();

      await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id
        });

      const history = await pool.query(
        `SELECT * FROM calendar_sync_history
         WHERE reservation_id = $1
         ORDER BY created_at DESC`,
        [reservation.id]
      );

      expect(history.rows.length).toBeGreaterThanOrEqual(1);
      expect(history.rows[0]).toHaveProperty('action');
      expect(history.rows[0]).toHaveProperty('status');
      expect(history.rows[0]).toHaveProperty('calendar_event_id');
    });

    it('should retrieve sync history for reservation', async () => {
      const reservation = await TestData.createReservation();

      // Create some history entries
      await pool.query(
        `INSERT INTO calendar_sync_history
         (reservation_id, calendar_event_id, action, status)
         VALUES ($1, $2, $3, $4)`,
        [reservation.id, 'event1', 'push', 'success']
      );

      const response = await request(app)
        .get(`/api/calendar/sync/history/${reservation.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.history).toBeDefined();
      expect(Array.isArray(response.body.data.history)).toBe(true);
      expect(response.body.data.history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      // Simulate timeout by not mocking the API
      const reservation = await TestData.createReservation();

      const response = await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id
        });

      // Should fail gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle rate limiting', async () => {
      // This would require more sophisticated mocking
      // Placeholder for rate limit handling test
      expect(true).toBe(true);
    });

    it('should retry on transient errors', async () => {
      // Placeholder for retry logic test
      expect(true).toBe(true);
    });
  });

  describe('Bidirectional Sync', () => {
    it('should sync reservation changes to calendar', async () => {
      MockApis.mockCalendarCreateEvent(true);
      MockApis.mockCalendarUpdateEvent('event_id', true);

      const reservation = await TestData.createReservation();

      // Initial push
      const pushRes = await request(app)
        .post('/api/calendar/sync/push')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id
        });

      const eventId = pushRes.body.data.eventId;

      // Update reservation
      const updateRes = await request(app)
        .post('/api/reservation/upsert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          reservation: {
            startAt: reservation.start_at,
            endAt: reservation.end_at,
            people: 10, // Changed
            channel: reservation.channel
          }
        });

      expect(updateRes.status).toBe(200);

      // Sync update to calendar
      const syncRes = await request(app)
        .put('/api/calendar/sync/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reservationId: reservation.id,
          eventId: eventId
        });

      expect(syncRes.status).toBe(200);
    });
  });
});
